/**
 * Storage & State Persistence Engine
 */
import { INITIAL_MEMBERS, CATEGORIES, INITIAL_TASKS, INITIAL_FINANCES, INITIAL_CONTRACTS, INITIAL_MINUTES, DEFAULT_PIN } from './data.js';

const STORAGE_KEYS = {
    MEMBERS: 'lj_members_v3_12',
    TASKS: 'lj_tasks_v3_12',
    FINANCES: 'lj_finances_v1',
    CONTRACTS: 'lj_contracts_v1',
    MINUTES: 'lj_minutes_v2',
    PIN: 'lj_vault_pin_v1',
    CURRENT_USER: 'lj_current_user_v1'
};

export class StorageEngine {
    static getMembers() {
        const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
        return raw ? JSON.parse(raw) : INITIAL_MEMBERS;
    }

    static saveMembers(members) {
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    }

    static getTasks() {
        const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
        return raw ? JSON.parse(raw) : INITIAL_TASKS;
    }

    static saveTasks(tasks) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }

    static getFinances() {
        const raw = localStorage.getItem(STORAGE_KEYS.FINANCES);
        return raw ? JSON.parse(raw) : INITIAL_FINANCES;
    }

    static saveFinances(finances) {
        localStorage.setItem(STORAGE_KEYS.FINANCES, JSON.stringify(finances));
    }

    static getContracts() {
        const raw = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
        return raw ? JSON.parse(raw) : INITIAL_CONTRACTS;
    }

    static saveContracts(contracts) {
        localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
    }

    static getMinutes() {
        const raw = localStorage.getItem(STORAGE_KEYS.MINUTES);
        return raw ? JSON.parse(raw) : INITIAL_MINUTES;
    }

    static saveMinutes(minutes) {
        localStorage.setItem(STORAGE_KEYS.MINUTES, JSON.stringify(minutes));
    }

    static getPIN() {
        return localStorage.getItem(STORAGE_KEYS.PIN) || DEFAULT_PIN;
    }

    static setPIN(newPin) {
        localStorage.setItem(STORAGE_KEYS.PIN, newPin);
    }

    static getCurrentUserId() {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'm1';
    }

    static setCurrentUserId(memberId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, memberId);
    }

    static exportFullBackup() {
        const backup = {
            version: '3.0',
            exportedAt: new Date().toISOString(),
            members: this.getMembers(),
            tasks: this.getTasks(),
            finances: this.getFinances(),
            contracts: this.getContracts(),
            minutes: this.getMinutes()
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `landjugend_scheuring_12_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    static resetToDefaults() {
        localStorage.removeItem(STORAGE_KEYS.MEMBERS);
        localStorage.removeItem(STORAGE_KEYS.TASKS);
        localStorage.removeItem(STORAGE_KEYS.FINANCES);
        localStorage.removeItem(STORAGE_KEYS.CONTRACTS);
        localStorage.removeItem(STORAGE_KEYS.MINUTES);
        window.location.reload();
    }
}
