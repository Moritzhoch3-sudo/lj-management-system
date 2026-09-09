/**
 * Cloud Storage & Realtime Sync Engine for Landjugend Scheuring
 * Synchronizes tasks, members, finances, minutes, and contracts across all devices in real-time.
 */

import { StorageEngine } from './storage.js';
import { PUBLIC_DB_KEY, SecurityUtils } from './utils/security.js';

const CLOUD_SYNC_KEY = 'lj_cloud_sync_config_v1';

export class CloudStorageEngine {
    static isEnabled = true;
    static syncStatus = 'connecting'; // 'connecting', 'online', 'syncing', 'offline'
    static listeners = [];
    static syncInterval = null;
    static lastSyncTimestamp = 0;
    static lastLocalMutationTimestamp = 0;
    static pushDebounceTimer = null;
    static channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lj_cloud_sync_bus') : null;

    static getCloudUrl() {
        return localStorage.getItem(CLOUD_SYNC_KEY) || '';
    }

    static setCloudUrl(url) {
        if (url) {
            const cleanUrl = url.trim().replace(/\/$/, '');
            if (!cleanUrl.startsWith('https://') && !cleanUrl.startsWith('http://localhost') && !cleanUrl.startsWith('http://127.0.0.1')) {
                console.warn('Insecure custom cloud URL rejected. Only HTTPS or localhost allowed.');
                return false;
            }
            localStorage.setItem(CLOUD_SYNC_KEY, cleanUrl);
        } else {
            localStorage.removeItem(CLOUD_SYNC_KEY);
        }
        this.init();
        return true;
    }

    static init(onUpdateCallback) {
        if (onUpdateCallback && !this.listeners.includes(onUpdateCallback)) {
            this.listeners.push(onUpdateCallback);
        }

        this.initBroadcast();
        this.updateStatus('connecting', 'Verbinde mit Cloud-Server...');

        // Initial Sync from Cloud / Backend
        this.pullAllFromCloud()
            .then(() => {
                this.updateStatus('online', '🟢 Live mit allen Geräten synchronisiert');
                this.startPolling();
            })
            .catch(err => {
                console.warn('Cloud sync fallback to local storage:', err);
                this.updateStatus('offline', '🟡 Offline-Modus (Lokal)');
                this.startPolling();
            });

        // Trigger immediate pull when tab becomes visible or focused
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.pullAllFromCloud();
                }
            });
            window.addEventListener('focus', () => {
                this.pullAllFromCloud();
            });
        }
    }

    static initBroadcast() {
        if (this.channel) {
            this.channel.onmessage = (event) => {
                if (event.data && event.data.type === 'SYNC_DATA') {
                    this.notifyListeners(event.data.payload);
                }
            };
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (e) => {
                if (e.key === 'lj_tasks_v3_12') {
                    this.notifyListeners({ tasks: StorageEngine.getTasks() });
                }
            });
        }
    }

    static broadcastLocalUpdate(payload) {
        if (this.channel) {
            try {
                this.channel.postMessage({ type: 'SYNC_DATA', payload });
            } catch (e) {}
        }
    }

    static updateStatus(status, label) {
        this.syncStatus = status;
        const badgeEl = document.getElementById('cloud-sync-badge');
        if (badgeEl) {
            badgeEl.className = `cloud-sync-badge status-${status}`;
            badgeEl.innerHTML = label;
        }
    }

    /**
     * Debounced immediate push to cloud whenever a change is made locally
     */
    static scheduleImmediatePush() {
        this.lastLocalMutationTimestamp = Date.now();
        if (this.pushDebounceTimer) clearTimeout(this.pushDebounceTimer);
        this.pushDebounceTimer = setTimeout(() => {
            this.pushAllToCloud();
        }, 200);
    }

    /**
     * Safely fetch JSON from an HTTP URL, bypassing mobile browser cache
     */
    static async safeFetchJson(url, options = {}) {
        try {
            const cacheBusterUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
            const vaultToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('backend_vault_token') : null;
            const authHeaders = {
                'X-Public-Key': PUBLIC_DB_KEY,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            };
            if (vaultToken) {
                authHeaders['Authorization'] = `Bearer ${vaultToken}`;
            }

            const fetchOpts = {
                ...options,
                cache: 'no-store',
                headers: {
                    ...authHeaders,
                    ...(options.headers || {})
                }
            };

            const resp = await fetch(cacheBusterUrl, fetchOpts);
            if (!resp.ok) return null;

            const contentType = resp.headers.get('content-type') || '';
            if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
                return null;
            }

            const data = await resp.json();
            return (data && typeof data === 'object') ? data : null;
        } catch (e) {
            return null;
        }
    }

    static shouldSync() {
        if (typeof document !== 'undefined' && document.hidden) return false;
        if (window.AutoSaveEngine && typeof window.AutoSaveEngine.isEligibleToSave === 'function') {
            return window.AutoSaveEngine.isEligibleToSave();
        }
        const currentUserId = StorageEngine.getCurrentUserId();
        return Boolean(currentUserId && currentUserId !== 'm0');
    }

    /**
     * Smart pull and merge that GUARANTEES local tasks never disappear!
     */
    static async pullAllFromCloud() {
        if (!this.shouldSync()) {
            return;
        }

        let cloudData = await this.safeFetchJson('/api/cloud-data', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!cloudData) {
            cloudData = await this.safeFetchJson('/cloud_db.json', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
        }

        const customUrl = this.getCloudUrl();
        if (!cloudData && customUrl) {
            cloudData = await this.safeFetchJson(`${customUrl}/lj_data.json`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
        }

        if (!cloudData || typeof cloudData !== 'object') {
            return;
        }

        const remoteTimestamp = cloudData._updatedAt || Date.now();
        let dataUpdated = false;

        // 1. SMART MERGE FOR TASKS (Zero Data Loss Protection)
        if (Array.isArray(cloudData.tasks)) {
            const localTasks = StorageEngine.getTasks() || [];
            const localMap = new Map(localTasks.map(t => [t.id, t]));
            const deletedIds = new Set(StorageEngine.getDeletedTaskIds());
            let tasksChanged = false;

            // Merge incoming cloud tasks into local state
            for (const rTask of cloudData.tasks) {
                if (!rTask || !rTask.id || deletedIds.has(rTask.id)) continue;
                const lTask = localMap.get(rTask.id);
                if (!lTask) {
                    // New task from another device!
                    localTasks.unshift(rTask);
                    localMap.set(rTask.id, rTask);
                    tasksChanged = true;
                } else {
                    // Task exists locally: update properties only if cloud is newer than local edits
                    if (remoteTimestamp > this.lastLocalMutationTimestamp) {
                        if (JSON.stringify(lTask) !== JSON.stringify(rTask)) {
                            Object.assign(lTask, rTask);
                            tasksChanged = true;
                        }
                    }
                }
            }

            // Check if local has tasks that the cloud does not have yet
            const cloudTaskIds = new Set(cloudData.tasks.map(t => t.id));
            const localOnlyTasks = localTasks.filter(t => !cloudTaskIds.has(t.id) && !deletedIds.has(t.id));
            if (localOnlyTasks.length > 0) {
                // Local has tasks that cloud lacks -> push immediately so cloud gets them!
                this.scheduleImmediatePush();
            }

            if (tasksChanged) {
                localStorage.setItem('lj_tasks_v3_12', JSON.stringify(localTasks));
                dataUpdated = true;
            }
        }

        // 2. MERGE MEMBERS & CATEGORIES
        const publicKeys = {
            members: 'lj_members_v12_varied_palette',
            categories: 'lj_categories_v1'
        };
        for (const [prop, sKey] of Object.entries(publicKeys)) {
            if (Array.isArray(cloudData[prop]) && cloudData[prop].length > 0) {
                const localRaw = localStorage.getItem(sKey);
                const cloudRaw = JSON.stringify(cloudData[prop]);
                if (localRaw !== cloudRaw && remoteTimestamp > this.lastLocalMutationTimestamp) {
                    localStorage.setItem(sKey, cloudRaw);
                    dataUpdated = true;
                }
            }
        }

        // 3. MERGE SENSITIVE COLLECTIONS (Only when Vault is unlocked)
        const vaultToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('backend_vault_token') : null;
        if (vaultToken) {
            const sensitiveKeys = {
                finances: 'lj_finances_v1',
                contracts: 'lj_contracts_v1',
                minutes: 'lj_minutes_v2'
            };
            for (const [prop, sKey] of Object.entries(sensitiveKeys)) {
                if (cloudData[prop] !== undefined && cloudData[prop] !== null) {
                    const localRaw = localStorage.getItem(sKey);
                    const cloudRaw = JSON.stringify(cloudData[prop]);
                    if (localRaw !== cloudRaw && remoteTimestamp > this.lastLocalMutationTimestamp) {
                        localStorage.setItem(sKey, cloudRaw);
                        dataUpdated = true;
                    }
                }
            }
        }

        // 4. Update hashes if received from cloud
        if (cloudData.centralAccessCodeHash) {
            localStorage.setItem('lj_app_central_code_hash_v1', String(cloudData.centralAccessCodeHash).trim());
        }
        if (cloudData.pinHash) {
            localStorage.setItem('lj_vault_pin_hash_v3', String(cloudData.pinHash).trim());
        }

        if (dataUpdated || remoteTimestamp > this.lastSyncTimestamp) {
            this.lastSyncTimestamp = remoteTimestamp;
            this.updateStatus('online', '🟢 Live mit allen Geräten synchronisiert');
            if (window.AutoSaveEngine && typeof window.AutoSaveEngine.updateBadge === 'function') {
                window.AutoSaveEngine.lastSaveTimestamp = Date.now();
                window.AutoSaveEngine.updateBadge('clean');
            }
            if (dataUpdated) {
                this.notifyListeners(cloudData);
            }
        }
    }

    /**
     * Push all local changes to the cloud immediately with proper authorization filtering
     */
    static async pushAllToCloud() {
        this.updateStatus('syncing', '🔄 Synchronisiere...');
        if (window.AutoSaveEngine && typeof window.AutoSaveEngine.updateBadge === 'function') {
            window.AutoSaveEngine.updateBadge('saving');
        }

        const vaultToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('backend_vault_token') : null;

        // Base payload: public collections only, avoiding unauthorized RLS 403 blocks
        const payload = {
            _updatedAt: Date.now(),
            members: StorageEngine.getMembers(),
            categories: StorageEngine.getCategories(),
            tasks: StorageEngine.getTasks()
        };

        // Only include sensitive collections when user is authorized in the Vault
        if (vaultToken) {
            payload.finances = StorageEngine.getFinances();
            payload.contracts = StorageEngine.getContracts();
            payload.minutes = StorageEngine.getMinutes();
            payload.pinHash = StorageEngine.getPINHashSync();
            payload.centralAccessCodeHash = StorageEngine.getCentralAccessCodeHash();
        }

        this.lastSyncTimestamp = payload._updatedAt;
        let pushedSuccess = false;

        // 1. Push to Vercel Serverless / Python Backend (/api/cloud-data)
        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Public-Key': PUBLIC_DB_KEY
            };
            if (vaultToken) {
                headers['Authorization'] = `Bearer ${vaultToken}`;
            }

            const resp = await fetch('/api/cloud-data', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                const contentType = resp.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    pushedSuccess = true;
                }
            }
        } catch (e) {}

        // 2. Push to custom external Cloud URL if configured
        const customUrl = this.getCloudUrl();
        if (customUrl && (customUrl.startsWith('https://') || customUrl.startsWith('http://localhost') || customUrl.startsWith('http://127.0.0.1'))) {
            try {
                const safeExternalPayload = { ...payload };
                delete safeExternalPayload.pinHash;
                delete safeExternalPayload.centralAccessCodeHash;

                const response = await fetch(`${customUrl}/lj_data.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(safeExternalPayload)
                });
                if (response.ok) {
                    pushedSuccess = true;
                }
            } catch (e) {}
        }

        if (pushedSuccess) {
            StorageEngine.isDirty = false;
            this.updateStatus('online', '🟢 Live mit allen Geräten synchronisiert');
            if (window.AutoSaveEngine && typeof window.AutoSaveEngine.updateBadge === 'function') {
                window.AutoSaveEngine.lastSaveTimestamp = Date.now();
                window.AutoSaveEngine.updateBadge('saved');
            }
        } else {
            this.updateStatus('offline', '🟡 Lokale Änderungen gesichert');
            if (window.AutoSaveEngine && typeof window.AutoSaveEngine.updateBadge === 'function') {
                window.AutoSaveEngine.updateBadge('offline');
            }
        }

        // Broadcast to other open tabs on this device
        this.broadcastLocalUpdate(payload);
    }

    static startPolling() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        // Snappy cross-device sync every 6 seconds
        this.syncInterval = setInterval(() => {
            this.pullAllFromCloud();
        }, 6000);
    }

    static notifyListeners(data) {
        this.listeners.forEach(fn => fn(data));
        window.dispatchEvent(new CustomEvent('lj_cloud_sync_update', { detail: data }));
    }
}
