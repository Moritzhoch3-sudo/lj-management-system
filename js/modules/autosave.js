/**
 * Auto-Save & User Activity Watchdog Engine for Landjugend Scheuring
 * 
 * Rules:
 * 1. Automatically saves / synchronizes every ~5 minutes (300,000 ms) if changes were made ("falls nötig").
 * 2. Only runs while someone is actively on the website (user interacting, tab visible).
 * 3. Does NOT run if the user is inactive (> 5 min of no interaction), tab is hidden, or nobody is logged in.
 */

import { StorageEngine } from '../storage.js';
import { CloudStorageEngine } from '../cloud-storage.js';

export class AutoSaveEngine {
    static AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    static INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without interaction = inactive
    static CHECK_INTERVAL_MS = 15 * 1000; // Check state every 15 seconds

    static lastActivityTimestamp = Date.now();
    static lastSaveTimestamp = Date.now();
    static isUserActive = true;
    static isPageVisible = typeof document !== 'undefined' ? !document.hidden : true;
    static intervalId = null;
    static isSaving = false;

    static init() {
        window.AutoSaveEngine = this;
        this.bindActivityListeners();
        this.renderBadge();
        this.startTimer();
    }

    static bindActivityListeners() {
        const resetActivity = () => {
            const wasInactive = !this.isUserActive;
            this.lastActivityTimestamp = Date.now();
            this.isUserActive = true;
            if (wasInactive) {
                this.updateBadge();
            }
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(evt => {
            window.addEventListener(evt, resetActivity, { passive: true });
        });

        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;
            if (!this.isPageVisible) {
                this.updateBadge('hidden');
            } else {
                this.lastActivityTimestamp = Date.now();
                this.isUserActive = true;
                this.updateBadge();
            }
        });

        // Listen for data modifications from StorageEngine
        window.addEventListener('lj_data_dirtied', () => {
            this.updateBadge();
        });

        // Safe unload
        window.addEventListener('beforeunload', () => {
            if (StorageEngine.isDirty && this.isEligibleToSave()) {
                CloudStorageEngine.pushAllToCloud();
            }
        });
    }

    static isUserLoggedIn() {
        const currentUserId = StorageEngine.getCurrentUserId();
        return Boolean(currentUserId && currentUserId !== 'm0');
    }

    static isEligibleToSave() {
        // 1. Must have a logged in member
        if (!this.isUserLoggedIn()) return false;

        // 2. Tab must be active and visible in browser
        if (!this.isPageVisible) return false;

        // 3. User must not be inactive (interaction within the last 5 minutes)
        const timeSinceActivity = Date.now() - this.lastActivityTimestamp;
        if (timeSinceActivity >= this.INACTIVITY_THRESHOLD_MS) {
            this.isUserActive = false;
            return false;
        }

        return true;
    }

    static startTimer() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            this.evaluateAndRun();
        }, this.CHECK_INTERVAL_MS);
    }

    static async evaluateAndRun() {
        const eligible = this.isEligibleToSave();

        if (!eligible) {
            if (!this.isPageVisible) {
                this.updateBadge('hidden');
            } else if (!this.isUserLoggedIn()) {
                this.updateBadge('not_logged_in');
            } else {
                this.updateBadge('inactive');
            }
            return;
        }

        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaveTimestamp;

        // Check if approximately 5 minutes have passed
        if (timeSinceLastSave >= this.AUTO_SAVE_INTERVAL_MS) {
            // "falls nötig": only save if dirty/changed
            if (StorageEngine.isDirty) {
                await this.triggerAutoSave();
            } else {
                // Keep interval baseline fresh without unnecessary network traffic
                this.lastSaveTimestamp = now;
                this.updateBadge('clean');
            }
        } else {
            this.updateBadge('active');
        }
    }

    static async triggerAutoSave() {
        if (this.isSaving) return;
        this.isSaving = true;
        this.updateBadge('saving');

        try {
            await CloudStorageEngine.pushAllToCloud();
            StorageEngine.isDirty = false;
            this.lastSaveTimestamp = Date.now();
            this.updateBadge('saved');
        } catch (e) {
            console.warn('Auto-Save:', e);
            this.updateBadge('offline');
        } finally {
            this.isSaving = false;
        }
    }

    static renderBadge() {
        let badge = document.getElementById('autosave-status-badge');
        if (!badge) {
            const targetContainer = document.querySelector('.header-actions') || document.querySelector('.donezo-header-actions');
            if (targetContainer) {
                badge = document.createElement('div');
                badge.id = 'autosave-status-badge';
                badge.className = 'autosave-badge';
                targetContainer.insertBefore(badge, targetContainer.firstChild);
            }
        }
        this.updateBadge('clean');
    }

    static updateBadge(forceState) {
        const badge = document.getElementById('autosave-status-badge');
        if (!badge) return;

        const timeStr = new Date(this.lastSaveTimestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        if (forceState === 'saving') {
            badge.className = 'autosave-badge autosave-saving';
            badge.innerHTML = `<span>🔄</span> <span>Speichert...</span>`;
            badge.title = 'Automatische 5-Minuten-Speicherung läuft...';
            return;
        }

        if (forceState === 'saved') {
            badge.className = 'autosave-badge autosave-saved';
            badge.innerHTML = `<span>💾</span> <span>Automatisch gesichert (${timeStr})</span>`;
            badge.title = `Erfolgreich um ${timeStr} gesichert. Nächster Prüfzyklus in ca. 5 Min.`;
            return;
        }

        if (forceState === 'hidden') {
            badge.className = 'autosave-badge autosave-hidden';
            badge.innerHTML = `<span>⏸️</span> <span>Hintergrund (Pause)</span>`;
            badge.title = 'Browser-Tab ist im Hintergrund. Automatische Speicherung und Abfragen pausiert.';
            return;
        }

        if (forceState === 'not_logged_in') {
            badge.className = 'autosave-badge autosave-inactive';
            badge.innerHTML = `<span>🔒</span> <span>Nicht angemeldet</span>`;
            badge.title = 'Kein Vorstandsmitglied ausgewählt. Auto-Save pausiert.';
            return;
        }

        if (forceState === 'inactive' || !this.isEligibleToSave()) {
            badge.className = 'autosave-badge autosave-inactive';
            badge.innerHTML = `<span>💤</span> <span>Inaktiv (Pause)</span>`;
            badge.title = 'Keine Benutzeraktivität seit über 5 Minuten. Automatische Speicherung pausiert bis zur nächsten Interaktion.';
            return;
        }

        // Active state
        if (StorageEngine.isDirty) {
            badge.className = 'autosave-badge autosave-dirty';
            badge.innerHTML = `<span>⏳</span> <span>Änderungen erfasst (Auto-Save 5m)</span>`;
            badge.title = 'Lokale Änderungen erfasst. Werden im 5-Minuten-Intervall bei Aktivität automatisch gesichert.';
        } else {
            badge.className = 'autosave-badge autosave-clean';
            badge.innerHTML = `<span>🟢</span> <span>Auto-Save aktiv (${timeStr})</span>`;
            badge.title = `Alles synchron (${timeStr}). Nächste Speicherung bei Änderungen in ca. 5 Minuten.`;
        }
    }
}
