/**
 * Storage & State Persistence Engine (Supports Instant Single Active PIN Verification & Member Passwords)
 */
import { INITIAL_MEMBERS, CATEGORIES, INITIAL_TASKS, INITIAL_FINANCES, INITIAL_CONTRACTS, INITIAL_MINUTES } from './data.js';
import { CloudStorageEngine } from './cloud-storage.js';

const STORAGE_KEYS = {
    MEMBERS: 'lj_members_v4_final',
    CATEGORIES: 'lj_categories_v1',
    TASKS: 'lj_tasks_v3_12',
    FINANCES: 'lj_finances_v1',
    CONTRACTS: 'lj_contracts_v1',
    MINUTES: 'lj_minutes_v2',
    PIN_HASH: 'lj_vault_pin_hash_v3',
    CURRENT_USER: 'lj_current_user_v1',
    LAST_CATEGORY: 'lj_last_category_v1',
    PIN: 'lj_vault_pin_plain_v1',
    MEMBER_PASSWORDS: 'lj_member_passwords_v1'
};

const DEFAULT_PIN = '1357';

const MEMBER_RESET_VERSION = 'lj_member_reset_v5';

export class StorageEngine {
    static getMembers() {
        // One-time forced reset: overwrite stale localStorage AND cloud with correct INITIAL_MEMBERS
        const resetDone = localStorage.getItem(MEMBER_RESET_VERSION);
        if (!resetDone) {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
            localStorage.setItem(MEMBER_RESET_VERSION, 'true');
            // Force push correct members to cloud (delayed to avoid circular init)
            setTimeout(() => CloudStorageEngine.pushAllToCloud(), 500);
            return INITIAL_MEMBERS;
        }

        const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
        if (!raw) {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
            return INITIAL_MEMBERS;
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length < 13) {
                localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
                return INITIAL_MEMBERS;
            }
            return parsed;
        } catch (e) {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
            return INITIAL_MEMBERS;
        }
    }

    static saveMembers(members) {
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
        CloudStorageEngine.pushAllToCloud();
    }

    static getCategories() {
        const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return raw ? JSON.parse(raw) : CATEGORIES;
    }

    static saveCategories(categories) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        CloudStorageEngine.pushAllToCloud();
    }

    static getTasks() {
        const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
        return raw ? JSON.parse(raw) : INITIAL_TASKS;
    }

    static saveTasks(tasks) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        CloudStorageEngine.pushAllToCloud();
    }

    static getFinances() {
        const raw = localStorage.getItem(STORAGE_KEYS.FINANCES);
        return raw ? JSON.parse(raw) : INITIAL_FINANCES;
    }

    static saveFinances(finances) {
        localStorage.setItem(STORAGE_KEYS.FINANCES, JSON.stringify(finances));
        CloudStorageEngine.pushAllToCloud();
    }

    static getContracts() {
        const raw = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
        return raw ? JSON.parse(raw) : INITIAL_CONTRACTS;
    }

    static saveContracts(contracts) {
        localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
        CloudStorageEngine.pushAllToCloud();
    }

    static getMinutes() {
        const raw = localStorage.getItem(STORAGE_KEYS.MINUTES);
        return raw ? JSON.parse(raw) : INITIAL_MINUTES;
    }

    static saveMinutes(minutes) {
        localStorage.setItem(STORAGE_KEYS.MINUTES, JSON.stringify(minutes));
        CloudStorageEngine.pushAllToCloud();
    }

    /**
     * Member Password Management
     */
    static getMemberPasswords() {
        const raw = localStorage.getItem(STORAGE_KEYS.MEMBER_PASSWORDS);
        return raw ? JSON.parse(raw) : {};
    }

    static getMemberPassword(memberId) {
        const map = this.getMemberPasswords();
        if (memberId === 'm4') {
            return map['m4'] || 'asdfghjklöä1234567890';
        }
        return map[memberId] || 'landjugend-scheuring';
    }

    /**
     * Plain PIN Retrieval & Instant Strict Verification
     */
    static getPIN() {
        return localStorage.getItem(STORAGE_KEYS.PIN) || DEFAULT_PIN;
    }

    static async setPIN(newPin) {
        const cleanPin = String(newPin).trim();
        localStorage.setItem(STORAGE_KEYS.PIN, cleanPin);
        
        // Compute SHA-256 hash for consistency
        const msgUint8 = new TextEncoder().encode(cleanPin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPin = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(STORAGE_KEYS.PIN_HASH, hashedPin);
    }

    static async verifyPIN(pinInput) {
        const cleanInput = String(pinInput).trim();
        const activePIN = this.getPIN();

        // INSTANT STRICT COMPARISON: ONLY the single active PIN is accepted!
        return cleanInput === activePIN;
    }

    /**
     * Member Password Management
     */
    static getMemberPasswords() {
        const raw = localStorage.getItem(STORAGE_KEYS.MEMBER_PASSWORDS);
        return raw ? JSON.parse(raw) : {};
    }

    static getMemberPassword(memberId) {
        const map = this.getMemberPasswords();
        return map[memberId] || 'landjugend-scheuring';
    }

    static setMemberPassword(memberId, newPass) {
        const map = this.getMemberPasswords();
        map[memberId] = String(newPass).trim();
        localStorage.setItem(STORAGE_KEYS.MEMBER_PASSWORDS, JSON.stringify(map));
    }

    /**
     * Reset all member passwords to 'landjugend-scheuring' EXCEPT Admin (Moritz Kubik)
     */
    static resetAllMemberPasswordsExceptAdmin() {
        const members = this.getMembers();
        const map = this.getMemberPasswords();
        const newMap = {};

        members.forEach(m => {
            if (this.isSuperAdmin(m.id)) {
                if (map[m.id]) {
                    newMap[m.id] = map[m.id];
                }
            } else {
                newMap[m.id] = 'landjugend-scheuring';
            }
        });

        localStorage.setItem(STORAGE_KEYS.MEMBER_PASSWORDS, JSON.stringify(newMap));
    }

    static getCurrentUserId() {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'm1';
    }

    static setCurrentUserId(memberId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, memberId);
    }

    static getLastSelectedCategory() {
        return localStorage.getItem(STORAGE_KEYS.LAST_CATEGORY) || '';
    }

    static setLastSelectedCategory(catId) {
        if (catId) {
            localStorage.setItem(STORAGE_KEYS.LAST_CATEGORY, catId);
        }
    }

    /**
     * Super Admin Check for Moritz Kubik (2. Kassier)
     */
    static isSuperAdmin(userId = this.getCurrentUserId()) {
        const members = this.getMembers();
        const currentUser = members.find(m => m.id === userId);
        if (!currentUser) return false;

        const cleanName = (currentUser.name || '').toLowerCase();
        const cleanRole = (currentUser.role || '').toLowerCase();
        return cleanName.includes('moritz') || cleanName.includes('kubik') || cleanRole.includes('2. kassier');
    }

    /**
     * Permission check: Moritz Kubik can edit all tasks; standard members can only edit tasks assigned to themselves.
     */
    static canUserEditTask(task, userId = this.getCurrentUserId()) {
        if (this.isSuperAdmin(userId)) return true;
        return task.assigneeId === userId;
    }

    /**
     * Export complete Dashboard & Task Overview as a Clean Native Excel CSV Spreadsheet
     */
    static exportExcelDashboard() {
        const members = this.getMembers();
        const tasks = this.getTasks();
        const categories = this.getCategories();

        let csvContent = "\uFEFF"; // UTF-8 BOM for Microsoft Excel

        csvContent += "Landjugend Scheuring - Vorstands-Dashboard & Aufgaben-Übersicht\n";
        csvContent += `Exportiert am:;${new Date().toLocaleString('de-DE')}\n\n`;

        members.forEach(m => {
            const mTasks = tasks.filter(t => t.assigneeId === m.id);
            const total = mTasks.length;
            const completed = mTasks.filter(t => t.status === 'erledigt').length;
            const inProgress = mTasks.filter(t => t.status === 'in_bearbeitung').length;
            const open = mTasks.filter(t => t.status === 'offen').length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            csvContent += `=========================================================================\n`;
            csvContent += `VORSTANDSMITGLIED:;${m.name};ROLLE / AMT:;${m.role};FORTSCHRITT:;${pct}%\n`;
            csvContent += `STATISTIK:;${completed} von ${total} erledigt;(${inProgress} in Bearbeitung | ${open} offen);;;\n`;
            csvContent += `-------------------------------------------------------------------------\n`;
            csvContent += `Aufgabenname;Kategorie;Priorität;Fälligkeitsdatum;Status;Beschreibung / Notiz\n`;

            if (mTasks.length === 0) {
                csvContent += `(Keine Aufgaben zugewiesen);-;-;-;-;-\n`;
            } else {
                mTasks.forEach(t => {
                    const cat = categories.find(c => c.id === t.categoryId) || { name: 'Allgemein' };
                    const titleClean = (t.title || '').replace(/;/g, ',').replace(/\n/g, ' ');
                    const descClean = (t.description || '').replace(/;/g, ',').replace(/\n/g, ' ');
                    const statusStr = t.status === 'erledigt' ? '✅ ERLEDIGT' : t.status === 'in_bearbeitung' ? '🔄 IN BEARBEITUNG' : '📋 OFFEN';

                    csvContent += `"${titleClean}";"${cat.name}";"${t.priority.toUpperCase()}";"${t.dueDate || 'Keins'}";"${statusStr}";"${descClean}"\n`;
                });
            }

            csvContent += `\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", `landjugend_scheuring_dashboard_uebersicht_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    static exportFullBackupJSON() {
        const backupData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            members: this.getMembers(),
            categories: this.getCategories(),
            tasks: this.getTasks(),
            finances: this.getFinances(),
            contracts: this.getContracts(),
            minutes: this.getMinutes(),
            pin: this.getPIN(),
            memberPasswords: this.getMemberPasswords()
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `landjugend_scheuring_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    static importFullBackupJSON(jsonStr) {
        try {
            const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
            if (!data || typeof data !== 'object') throw new Error('Ungültige Backup-Datei');

            if (Array.isArray(data.members)) this.saveMembers(data.members);
            if (Array.isArray(data.categories)) this.saveCategories(data.categories);
            if (Array.isArray(data.tasks)) this.saveTasks(data.tasks);
            if (Array.isArray(data.finances)) this.saveFinances(data.finances);
            if (Array.isArray(data.contracts)) this.saveContracts(data.contracts);
            if (Array.isArray(data.minutes)) this.saveMinutes(data.minutes);
            if (data.pin) this.setPIN(data.pin);
            if (data.memberPasswords && typeof data.memberPasswords === 'object') {
                localStorage.setItem(STORAGE_KEYS.MEMBER_PASSWORDS, JSON.stringify(data.memberPasswords));
            }

            CloudStorageEngine.pushAllToCloud();
            return { success: true };
        } catch (e) {
            console.error('Import error:', e);
            return { success: false, error: e.message };
        }
    }

    static resetToDefaults() {
        localStorage.removeItem(STORAGE_KEYS.MEMBERS);
        localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
        localStorage.removeItem(STORAGE_KEYS.TASKS);
        localStorage.removeItem(STORAGE_KEYS.FINANCES);
        localStorage.removeItem(STORAGE_KEYS.CONTRACTS);
        localStorage.removeItem(STORAGE_KEYS.MINUTES);
        localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
        localStorage.removeItem(STORAGE_KEYS.PIN);
        localStorage.removeItem(STORAGE_KEYS.MEMBER_PASSWORDS);
        window.location.reload();
    }
}
