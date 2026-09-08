/**
 * Main Application Orchestrator (Next-Gen Executive Standard)
 */
import { StorageEngine } from './storage.js';
import { TasksModule } from './modules/tasks.js';
import { DashboardModule } from './modules/dashboard.js';
import { VaultGuard } from './modules/vault.js';
import { FinanceModule } from './modules/finance.js';
import { ContractsModule } from './modules/contracts.js';
import { MinutesModule } from './modules/minutes.js';
import { SettingsModule } from './modules/settings.js';

let activeTab = 'dashboard';

class App {
    static init() {
        this.showMainApp();
    }

    static showMainApp() {
        this.renderNavbar();
        this.bindGlobalEvents();
        this.switchTab(activeTab);
    }

    static renderNavbar() {
        const members = StorageEngine.getMembers();
        const currentUserId = StorageEngine.getCurrentUserId();
        const currentUser = members.find(m => m.id === currentUserId) || members[0];

        // Update User Simulator Select Box
        const userSelectEl = document.getElementById('user-simulator-select');
        if (userSelectEl) {
            userSelectEl.innerHTML = members.map(m => `
                <option value="${m.id}" ${m.id === currentUserId ? 'selected' : ''}>
                    ${m.avatar} ${m.name} (${m.role})
                </option>
            `).join('');

            userSelectEl.onchange = (e) => {
                StorageEngine.setCurrentUserId(e.target.value);
                this.renderNavbar();
                this.switchTab(activeTab);
            };
        }

        // Update Sidebar User Profile Chip
        const sidebarAvatar = document.getElementById('sidebar-user-avatar');
        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarRole = document.getElementById('sidebar-user-role');

        if (sidebarAvatar && sidebarName && sidebarRole && currentUser) {
            sidebarAvatar.textContent = currentUser.avatar || '👤';
            sidebarName.textContent = currentUser.name || 'Vorstandsmitglied';
            sidebarRole.textContent = currentUser.role || 'Landjugend Scheuring';
            sidebarRole.style.color = currentUser.color || '#10b981';
        }
    }

    static bindGlobalEvents() {
        // Sidebar Navigation Links
        document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.handleTabClick(targetTab);
            });
        });

        // Backup & Reset Buttons
        document.getElementById('export-backup-btn')?.addEventListener('click', () => {
            StorageEngine.exportFullBackup();
        });

        document.getElementById('reset-data-btn')?.addEventListener('click', () => {
            if (confirm('Achtung: Auf Standarddaten zurücksetzen? Alle Änderungen gehen verloren.')) {
                StorageEngine.resetToDefaults();
            }
        });
    }

    static handleTabClick(targetTab) {
        const protectedTabs = ['finance', 'contracts', 'minutes'];

        if (protectedTabs.includes(targetTab)) {
            VaultGuard.isUnlocked().then(isUnlocked => {
                if (isUnlocked) {
                    this.switchTab(targetTab);
                } else {
                    const names = {
                        finance: '💰 Finanzen & Kassenbuch',
                        contracts: '📄 Verträge & Sponsoring',
                        minutes: '🎙️ Sitzungsprotokolle & Audio-Aufnahme'
                    };
                    VaultGuard.renderPinModal(() => {
                        this.switchTab(targetTab);
                    }, names[targetTab]);
                }
            });
        } else {
            this.switchTab(targetTab);
        }
    }

    static switchTab(tabName) {
        activeTab = tabName;

        // Update Nav Active State
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            if (link.dataset.tab === tabName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update Page View Title in Topbar
        const viewTitleEl = document.getElementById('page-view-title');
        const titleMap = {
            dashboard: '📊 Vorstands-Dashboard & Übersicht',
            tasks: '📌 Aufgaben-Verwaltung & To-Dos',
            finance: '💰 Finanzen & Kassenbuch 🔒',
            contracts: '📄 Verträge & Sponsoring 🔒',
            minutes: '🎙️ Sitzungen, Audio & Protokolle 🔒',
            settings: '⚙️ Einstellungen & System-Verwaltung'
        };
        if (viewTitleEl) {
            viewTitleEl.textContent = titleMap[tabName] || 'Vorstands-Zentrale';
        }

        const mainContentEl = document.getElementById('main-content-view');
        if (!mainContentEl) return;

        mainContentEl.innerHTML = '';

        switch (tabName) {
            case 'dashboard':
                DashboardModule.render(mainContentEl, (memberId) => {
                    TasksModule.setFilterMember(memberId);
                    this.switchTab('tasks');
                });
                break;
            case 'tasks':
                TasksModule.render(mainContentEl);
                break;
            case 'finance':
                FinanceModule.render(mainContentEl);
                this.bindVaultRelockBtn(mainContentEl);
                break;
            case 'contracts':
                ContractsModule.render(mainContentEl);
                this.bindVaultRelockBtn(mainContentEl);
                break;
            case 'minutes':
                MinutesModule.render(mainContentEl);
                this.bindVaultRelockBtn(mainContentEl);
                break;
            case 'settings':
                SettingsModule.render(mainContentEl, () => {
                    this.renderNavbar();
                });
                break;
            default:
                DashboardModule.render(mainContentEl, (memberId) => {
                    TasksModule.setFilterMember(memberId);
                    this.switchTab('tasks');
                });
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    static bindVaultRelockBtn(containerEl) {
        const lockBtn = containerEl.querySelector('.lock-vault-btn');
        if (lockBtn) {
            lockBtn.addEventListener('click', () => {
                VaultGuard.lock();
                alert('🔒 Geschützter Bereich wurde wieder gesperrt.');
                this.switchTab('dashboard');
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
