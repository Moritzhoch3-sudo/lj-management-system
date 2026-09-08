/**
 * Main Application Orchestrator & View Controller (Direct Dashboard Landing)
 */
import { StorageEngine } from './storage.js';
import { TasksModule } from './modules/tasks.js';
import { DashboardModule } from './modules/dashboard.js';
import { VaultGuard } from './modules/vault.js';
import { FinanceModule } from './modules/finance.js';
import { ContractsModule } from './modules/contracts.js';
import { MinutesModule } from './modules/minutes.js';
import { SettingsModule } from './modules/settings.js';

let activeTab = 'dashboard'; // Direct Landing on Dashboard!

class App {
    static init() {
        this.showMainApp();
    }

    static showMainApp() {
        const headerEl = document.querySelector('.app-header');
        if (headerEl) headerEl.style.display = 'block';

        this.renderNavbar();
        this.bindGlobalEvents();
        this.switchTab(activeTab);
    }

    static renderNavbar() {
        const members = StorageEngine.getMembers();
        const currentUserId = StorageEngine.getCurrentUserId();

        const userSelectEl = document.getElementById('user-simulator-select');
        if (userSelectEl) {
            userSelectEl.innerHTML = members.map(m => `
                <option value="${m.id}" ${m.id === currentUserId ? 'selected' : ''}>
                    ${m.avatar} ${m.name} (${m.role})
                </option>
            `).join('');

            userSelectEl.onchange = (e) => {
                StorageEngine.setCurrentUserId(e.target.value);
                this.switchTab(activeTab);
            };
        }
    }

    static bindGlobalEvents() {
        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.handleTabClick(targetTab);
            });
        });

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

        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.tab === tabName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

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
