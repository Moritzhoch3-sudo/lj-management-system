/**
 * Cloud Storage & Realtime Sync Engine for Landjugend Scheuring
 * Synchronizes tasks, members, finances, minutes, and contracts across all devices every 10 seconds.
 */

import { StorageEngine } from './storage.js';

const CLOUD_SYNC_KEY = 'lj_cloud_sync_config_v1';

export class CloudStorageEngine {
    static isEnabled = true;
    static syncStatus = 'connecting'; // 'connecting', 'online', 'syncing', 'offline'
    static listeners = [];
    static syncInterval = null;
    static lastSyncTimestamp = 0;

    static getCloudUrl() {
        return localStorage.getItem(CLOUD_SYNC_KEY) || '';
    }

    static setCloudUrl(url) {
        if (url) {
            localStorage.setItem(CLOUD_SYNC_KEY, url.trim().replace(/\/$/, ''));
        } else {
            localStorage.removeItem(CLOUD_SYNC_KEY);
        }
        this.init();
    }

    static init(onUpdateCallback) {
        if (onUpdateCallback && !this.listeners.includes(onUpdateCallback)) {
            this.listeners.push(onUpdateCallback);
        }

        this.updateStatus('connecting', 'Verbinde mit Cloud-Server...');
        
        // Initial Sync from Cloud / Backend
        this.pullAllFromCloud()
            .then(() => {
                this.updateStatus('online', '🟢 Live mit allen Geräten synchronisiert (10s)');
                this.startPolling();
            })
            .catch(err => {
                console.warn('Cloud sync fallback to local storage:', err);
                this.updateStatus('offline', '🟡 Offline-Modus (Lokal)');
                this.startPolling();
            });
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
     * Safely fetch JSON from an HTTP URL, bypassing mobile browser cache and validating content-type
     */
    static async safeFetchJson(url, options = {}) {
        try {
            // Append cache buster timestamp query string to prevent mobile browser 304 caching
            const cacheBusterUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
            
            const fetchOpts = {
                ...options,
                cache: 'no-store',
                headers: {
                    ...(options.headers || {}),
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            };

            const resp = await fetch(cacheBusterUrl, fetchOpts);
            if (!resp.ok) return null;

            const contentType = resp.headers.get('content-type') || '';
            if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
                // Ignore HTML fallback pages (e.g. Vercel SPA index.html on 404)
                return null;
            }

            const data = await resp.json();
            return (data && typeof data === 'object') ? data : null;
        } catch (e) {
            return null;
        }
    }

    static shouldSync() {
        if (document.hidden) return false;
        if (window.AutoSaveEngine && typeof window.AutoSaveEngine.isEligibleToSave === 'function') {
            return window.AutoSaveEngine.isEligibleToSave();
        }
        const currentUserId = StorageEngine.getCurrentUserId();
        return Boolean(currentUserId && currentUserId !== 'm0');
    }

    static async pullAllFromCloud() {
        if (!this.shouldSync()) {
            return;
        }
        let cloudData = null;

        // Strategy 1: Try Vercel Serverless Function or Python Local Backend (/api/cloud-data)
        cloudData = await this.safeFetchJson('/api/cloud-data', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        // Strategy 2: Try static deployment database file (/cloud_db.json)
        if (!cloudData) {
            cloudData = await this.safeFetchJson('/cloud_db.json', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
        }

        // Strategy 3: Try external configured cloud database URL (Firebase / JSONBin / KV)
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

        const keyMap = {
            categories: 'lj_categories_v1',
            tasks: 'lj_tasks_v3_12',
            finances: 'lj_finances_v1',
            contracts: 'lj_contracts_v1',
            minutes: 'lj_minutes_v2'
        };

        // Always check if cloud data content differs from local storage content
        for (const [prop, storageKey] of Object.entries(keyMap)) {
            if (cloudData[prop] !== undefined && cloudData[prop] !== null) {
                const localRaw = localStorage.getItem(storageKey);
                const cloudRaw = JSON.stringify(cloudData[prop]);

                // If local storage doesn't match cloud data, update immediately!
                if (localRaw !== cloudRaw) {
                    localStorage.setItem(storageKey, cloudRaw);
                    dataUpdated = true;
                }
            }
        }

        // Synchronize central access code & vault pin hashes if present
        if (cloudData.centralAccessCodeHash) {
            localStorage.setItem('lj_app_central_code_hash_v1', String(cloudData.centralAccessCodeHash).trim());
        }
        if (cloudData.pinHash) {
            localStorage.setItem('lj_vault_pin_hash_v3', String(cloudData.pinHash).trim());
        }

        if (dataUpdated || remoteTimestamp > this.lastSyncTimestamp) {
            this.lastSyncTimestamp = remoteTimestamp;
            this.updateStatus('online', '🟢 Live synchronisiert (Auto-Save 5m)');
            if (dataUpdated) {
                this.notifyListeners(cloudData);
            }
        }
    }

    static async pushAllToCloud() {
        this.updateStatus('syncing', '🔄 Synchronisiere...');

        const payload = {
            _updatedAt: Date.now(),
            centralAccessCodeHash: StorageEngine.getCentralAccessCodeHash(),
            pinHash: StorageEngine.getPINHashSync(),
            members: JSON.parse(localStorage.getItem('lj_members_v12_varied_palette') || 'null') || StorageEngine.getMembers(),
            categories: JSON.parse(localStorage.getItem('lj_categories_v1') || 'null') || StorageEngine.getCategories(),
            tasks: JSON.parse(localStorage.getItem('lj_tasks_v3_12') || 'null') || StorageEngine.getTasks(),
            finances: JSON.parse(localStorage.getItem('lj_finances_v1') || 'null') || StorageEngine.getFinances(),
            contracts: JSON.parse(localStorage.getItem('lj_contracts_v1') || 'null') || StorageEngine.getContracts(),
            minutes: JSON.parse(localStorage.getItem('lj_minutes_v2') || 'null') || StorageEngine.getMinutes()
        };

        this.lastSyncTimestamp = payload._updatedAt;
        let pushedSuccess = false;

        // 1. Push to Vercel Serverless / Python Backend (/api/cloud-data)
        try {
            const resp = await fetch('/api/cloud-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        if (customUrl) {
            try {
                const response = await fetch(`${customUrl}/lj_data.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    pushedSuccess = true;
                }
            } catch (e) {}
        }

        StorageEngine.isDirty = false;
        if (window.AutoSaveEngine && typeof window.AutoSaveEngine.updateBadge === 'function') {
            window.AutoSaveEngine.updateBadge('saved');
        }

        if (pushedSuccess) {
            this.updateStatus('online', '🟢 Live synchronisiert (Auto-Save 5m)');
        } else {
            this.updateStatus('offline', '🟡 Lokale Änderungen gespeichert');
        }
    }

    static startPolling() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        // Synchronize every 10 seconds across all devices
        this.syncInterval = setInterval(() => {
            this.pullAllFromCloud();
        }, 10000);
    }

    static notifyListeners(data) {
        this.listeners.forEach(fn => fn(data));
        window.dispatchEvent(new CustomEvent('lj_cloud_sync_update', { detail: data }));
    }
}
