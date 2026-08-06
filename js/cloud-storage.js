/**
 * Cloud Storage & Realtime Sync Engine for Landjugend Scheuring
 * Synchronizes tasks, members, finances, minutes, and contracts across all devices.
 */

const CLOUD_SYNC_KEY = 'lj_cloud_sync_config_v1';
const DEFAULT_FIREBASE_URL = 'https://lj-scheuring-default-rtdb.europe-west1.firebasedatabase.app';

export class CloudStorageEngine {
    static isEnabled = true;
    static syncStatus = 'connecting'; // 'connecting', 'online', 'syncing', 'offline'
    static listeners = [];
    static syncInterval = null;
    static lastSyncTimestamp = 0;

    static getCloudUrl() {
        const customUrl = localStorage.getItem(CLOUD_SYNC_KEY);
        return customUrl || DEFAULT_FIREBASE_URL;
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
        
        // Initial Pull from Cloud
        this.pullAllFromCloud()
            .then(() => {
                this.updateStatus('online', '🟢 Live mit Vorstandschaft synchronisiert');
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

    static async pullAllFromCloud() {
        const cloudUrl = this.getCloudUrl();
        if (!cloudUrl) return;

        try {
            const response = await fetch(`${cloudUrl}/lj_data.json`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) return;

            if (!cloudData || typeof cloudData !== 'object') {
                await this.pushAllToCloud();
                return;
            }

            // Check if remote data is newer
            let dataUpdated = false;
            const remoteTimestamp = cloudData._updatedAt || 0;

            if (remoteTimestamp > this.lastSyncTimestamp) {
                this.lastSyncTimestamp = remoteTimestamp;

                const keyMap = {
                    members: 'lj_members_v10_final',
                    categories: 'lj_categories_v1',
                    tasks: 'lj_tasks_v3_12',
                    finances: 'lj_finances_v1',
                    contracts: 'lj_contracts_v1',
                    minutes: 'lj_minutes_v2'
                };

                for (const [prop, storageKey] of Object.entries(keyMap)) {
                    if (cloudData[prop] !== undefined && cloudData[prop] !== null) {
                        // NEVER overwrite local members from cloud - INITIAL_MEMBERS in data.js is authoritative
                        if (prop === 'members') {
                            continue;
                        }
                        const localRaw = localStorage.getItem(storageKey);
                        const cloudRaw = JSON.stringify(cloudData[prop]);
                        if (localRaw !== cloudRaw) {
                            localStorage.setItem(storageKey, cloudRaw);
                            dataUpdated = true;
                        }
                    }
                }

                if (dataUpdated) {
                    this.notifyListeners(cloudData);
                }
            }
        } catch (e) {
            // Quiet failover for offline mode
        }
    }

    static async pushAllToCloud() {
        const cloudUrl = this.getCloudUrl();
        if (!cloudUrl) return;

        this.updateStatus('syncing', '🔄 Synchronisiere...');

        const payload = {
            _updatedAt: Date.now(),
            members: JSON.parse(localStorage.getItem('lj_members_v10_final') || 'null'),
            categories: JSON.parse(localStorage.getItem('lj_categories_v1') || 'null'),
            tasks: JSON.parse(localStorage.getItem('lj_tasks_v3_12') || 'null'),
            finances: JSON.parse(localStorage.getItem('lj_finances_v1') || 'null'),
            contracts: JSON.parse(localStorage.getItem('lj_contracts_v1') || 'null'),
            minutes: JSON.parse(localStorage.getItem('lj_minutes_v2') || 'null')
        };

        this.lastSyncTimestamp = payload._updatedAt;

        try {
            const response = await fetch(`${cloudUrl}/lj_data.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                this.updateStatus('online', '🟢 Live mit Vorstandschaft synchronisiert');
            } else {
                this.updateStatus('offline', '🟡 Lokale Änderungen gespeichert');
            }
        } catch (e) {
            this.updateStatus('offline', '🟡 Lokale Änderungen gespeichert (Offline)');
        }
    }

    static startPolling() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            this.pullAllFromCloud();
        }, 4000);
    }

    static notifyListeners(data) {
        this.listeners.forEach(fn => fn(data));
        window.dispatchEvent(new CustomEvent('lj_cloud_sync_update', { detail: data }));
    }
}
