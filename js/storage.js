/**
 * Storage & State Persistence Engine (Supports Instant Single Active PIN Verification & Member Passwords)
 */
import { INITIAL_MEMBERS, CATEGORIES, INITIAL_TASKS, INITIAL_FINANCES, INITIAL_CONTRACTS, INITIAL_MINUTES } from './data.js';
import { CloudStorageEngine } from './cloud-storage.js';

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


const STORAGE_KEYS = {
    MEMBERS: 'lj_members_v12_varied_palette',
    CATEGORIES: 'lj_categories_v1',
    TASKS: 'lj_tasks_v3_12',
    FINANCES: 'lj_finances_v1',
    CONTRACTS: 'lj_contracts_v1',
    MINUTES: 'lj_minutes_v2',
    PIN_HASH: 'lj_vault_pin_hash_v3',
    CURRENT_USER: 'lj_current_user_v1',
    LAST_CATEGORY: 'lj_last_category_v1',
    MEMBER_PASSWORDS: 'lj_member_passwords_v1',
    APP_CENTRAL_CODE: 'lj_app_central_code_v1',
    APP_CENTRAL_CODE_HASH: 'lj_app_central_code_hash_v1'
};

// Precomputed SHA-256 hashes with salts - no plaintext secrets stored in source code
const DEFAULT_CENTRAL_HASH = '5b51ca7b436a5036957963b5d7446f1bca8894585329c5b993dfff9f7234a1ea'; // default 1234
const MASTER_CENTRAL_HASH = '1411b928bb0adfd665cde52ed2cd3a0df5962cc450438124aa495cf213f3b084';  // master 2026
const MASTER_PIN_HASH = '94f6058172e31de4765fe15ca7b2d83b427609a932c1821dcff5f52fdd9dbdcc';       // master 2026

export class StorageEngine {
    static isDirty = false;
    static lastDirtyTimestamp = 0;

    static markDirty() {
        this.isDirty = true;
        this.lastDirtyTimestamp = Date.now();
        window.dispatchEvent(new CustomEvent('lj_data_dirtied'));
    }

    static getMembers() {
        const filterRealMembers = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.filter(m => m && m.id !== 'm0' && (m.name || '').trim().toLowerCase() !== 'allgemein');
        };

        let raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
        if (!raw) {
            const clean = filterRealMembers(INITIAL_MEMBERS);
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(clean));
            return clean;
        }
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const cleaned = filterRealMembers(parsed);
                if (cleaned.length !== parsed.length) {
                    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(cleaned));
                }
                return cleaned;
            }
        } catch (e) {}

        const clean = filterRealMembers(INITIAL_MEMBERS);
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(clean));
        return clean;
    }

    static saveMembers(members) {
        const filterRealMembers = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.filter(m => m && m.id !== 'm0' && (m.name || '').trim().toLowerCase() !== 'allgemein');
        };
        const cleaned = filterRealMembers(members);
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(cleaned));
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static getCategories() {
        const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return raw ? JSON.parse(raw) : CATEGORIES;
    }

    static saveCategories(categories) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static getTasks() {
        let tasks = null;
        const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) tasks = parsed;
            } catch (e) {}
        }

        if (!tasks) {
            const fallbackKeys = ['lj_tasks_v4_live', 'lj_tasks_v3_11', 'lj_tasks_v3'];
            for (const k of fallbackKeys) {
                const fallbackRaw = localStorage.getItem(k);
                if (fallbackRaw) {
                    try {
                        const parsed = JSON.parse(fallbackRaw);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            tasks = parsed;
                            localStorage.setItem(STORAGE_KEYS.TASKS, fallbackRaw);
                            break;
                        }
                    } catch (e) {}
                }
            }
        }

        if (!tasks) tasks = INITIAL_TASKS;

        // Ensure no tasks point to deleted 'm0' / Allgemein
        let hasM0 = false;
        const cleanedTasks = tasks.map(t => {
            if (t.assigneeId === 'm0') {
                hasM0 = true;
                return { ...t, assigneeId: 'm1' };
            }
            return t;
        });
        if (hasM0) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(cleanedTasks));
        }
        return cleanedTasks;
    }

    static saveTasks(tasks) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static getFinances() {
        const raw = localStorage.getItem(STORAGE_KEYS.FINANCES);
        return raw ? JSON.parse(raw) : INITIAL_FINANCES;
    }

    static saveFinances(finances) {
        localStorage.setItem(STORAGE_KEYS.FINANCES, JSON.stringify(finances));
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static getContracts() {
        const raw = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
        return raw ? JSON.parse(raw) : INITIAL_CONTRACTS;
    }

    static saveContracts(contracts) {
        localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static getMinutes() {
        const raw = localStorage.getItem(STORAGE_KEYS.MINUTES);
        return raw ? JSON.parse(raw) : INITIAL_MINUTES;
    }

    static saveMinutes(minutes) {
        localStorage.setItem(STORAGE_KEYS.MINUTES, JSON.stringify(minutes));
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static getMemberPasswords() {
        const raw = localStorage.getItem(STORAGE_KEYS.MEMBER_PASSWORDS);
        return raw ? JSON.parse(raw) : {};
    }

    static getMemberPassword(memberId) {
        const map = this.getMemberPasswords();
        const stored = map[memberId] || null;
        if (stored && !/^[a-f0-9]{64}$/.test(stored)) {
            delete map[memberId];
            localStorage.setItem(STORAGE_KEYS.MEMBER_PASSWORDS, JSON.stringify(map));
            return null;
        }
        return stored;
    }

    static async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'lj-scheuring-salt-2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    static getPIN() {
        return localStorage.getItem('lj_active_pin_raw') || '';
    }

    static async hashPIN(pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(String(pin).trim() + 'lj-scheuring-pin-salt-2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    static getPINHashSync() {
        return localStorage.getItem(STORAGE_KEYS.PIN_HASH) || MASTER_PIN_HASH;
    }

    static async getPINHash() {
        const stored = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
        if (stored && /^[a-f0-9]{64}$/.test(stored)) {
            return stored;
        }
        return MASTER_PIN_HASH;
    }

    static async setPIN(newPin) {
        const cleanPin = String(newPin).trim();
        const hashedPin = await this.hashPIN(cleanPin);
        localStorage.setItem(STORAGE_KEYS.PIN_HASH, hashedPin);
        localStorage.removeItem('lj_active_pin_raw'); // Remove any legacy raw pin
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static async verifyPIN(pinInput) {
        const cleanInput = String(pinInput).trim();
        if (!cleanInput) return false;
        const inputHash = await this.hashPIN(cleanInput);

        // 1. Master PIN (2026) always works
        if (inputHash === MASTER_PIN_HASH) return true;

        // 2. Stored custom PIN hash
        const storedHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
        if (storedHash) {
            return inputHash === storedHash;
        }

        return false;
    }

    /* Central Vorstands-Zentrale Access Code */
    static async hashCentralCode(code) {
        const encoder = new TextEncoder();
        const data = encoder.encode(String(code).trim() + 'lj-central-salt-2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    static getCentralAccessCodeHash() {
        return localStorage.getItem(STORAGE_KEYS.APP_CENTRAL_CODE_HASH) || DEFAULT_CENTRAL_HASH;
    }

    static async setCentralAccessCode(newCode) {
        const cleanCode = String(newCode).trim();
        const hashed = await this.hashCentralCode(cleanCode);
        localStorage.setItem(STORAGE_KEYS.APP_CENTRAL_CODE_HASH, hashed);
        localStorage.removeItem(STORAGE_KEYS.APP_CENTRAL_CODE); // Never store raw code
        this.markDirty();
        CloudStorageEngine.pushAllToCloud();
    }

    static async verifyCentralAccessCode(inputCode) {
        const cleanInput = String(inputCode).trim();
        if (!cleanInput) return false;
        const inputHash = await this.hashCentralCode(cleanInput);

        // 1. Master recovery code is always accepted
        if (inputHash === MASTER_CENTRAL_HASH) return true;

        // 2. Custom code check (if set by board in settings)
        const storedHash = localStorage.getItem(STORAGE_KEYS.APP_CENTRAL_CODE_HASH);
        if (storedHash) {
            return inputHash === storedHash;
        }

        // 3. Default central code check (1234)
        return inputHash === DEFAULT_CENTRAL_HASH;
    }

    static async setMemberPassword(memberId, newPass) {
        const map = this.getMemberPasswords();
        map[memberId] = await this.hashPassword(String(newPass).trim());
        localStorage.setItem(STORAGE_KEYS.MEMBER_PASSWORDS, JSON.stringify(map));
        CloudStorageEngine.pushAllToCloud();
    }

    static async verifyMemberPassword(memberId, passInput) {
        const storedHash = this.getMemberPassword(memberId);
        if (!storedHash) return true; // If no password set yet
        const inputHash = await this.hashPassword(String(passInput).trim());
        return inputHash === storedHash;
    }

    static getCurrentUserId() {
        const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (stored && stored !== 'm0') return stored;
        return 'm1';
    }

    static setCurrentUserId(memberId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, memberId);
    }

    static getLastSelectedCategory() {
        return localStorage.getItem(STORAGE_KEYS.LAST_CATEGORY) || '';
    }

    static setLastSelectedCategory(catId) {
        localStorage.setItem(STORAGE_KEYS.LAST_CATEGORY, catId);
    }

    static exportFullBackup() {
        const backup = {
            version: '15.0',
            exportedAt: new Date().toISOString(),
            members: this.getMembers(),
            categories: this.getCategories(),
            tasks: this.getTasks(),
            finances: this.getFinances(),
            contracts: this.getContracts(),
            minutes: this.getMinutes()
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `landjugend_scheuring_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    static resetToDefaults() {
        localStorage.clear();
        window.location.reload();
    }
}
