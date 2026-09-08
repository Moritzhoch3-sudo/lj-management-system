/**
 * Main Application Orchestrator & Initial Login Guard Controller
 */
import { StorageEngine } from './storage.js';
import { TasksModule } from './modules/tasks.js';
import { DashboardModule } from './modules/dashboard.js';
import { VaultGuard } from './modules/vault.js';
import { FinanceModule } from './modules/finance.js';
import { ContractsModule } from './modules/contracts.js';
import { MinutesModule } from './modules/minutes.js';
import { SettingsModule } from './modules/settings.js';

let activeTab = 'tasks';

class App {
    static init() {
        const loggedInUser = sessionStorage.getItem('lj_logged_in_user');
        if (!loggedInUser) {
            this.showLoginScreen();
        } else {
            this.showMainApp();
        }
    }

    static showLoginScreen() {
        const members = StorageEngine.getMembers();
        const mainContentEl = document.getElementById('main-content-view');
        const headerEl = document.querySelector('.app-header');

        if (headerEl) headerEl.style.display = 'none';

        if (mainContentEl) {
            mainContentEl.innerHTML = `
                <div class="login-container">
                    <div class="card-glow login-card">
                        <div class="login-header text-center">
                            <img src="assets/logo.svg" alt="Landjugend Scheuring Logo" class="login-logo-img" />
                            <h2 class="mt-3 mb-1">Vorstands-Zentrale</h2>
                            <p class="text-muted font-size-sm">Bitte wähle dein Profil aus, um dich anzumelden.</p>
                        </div>

                        <form id="initial-login-form" class="mt-4">
                            <div class="form-group">
                                <label>Vorstandsmitglied auswählen *</label>
                                <select id="login-user-select" class="form-select form-select-lg" required>
                                    ${members.map(m => `
                                        <option value="${m.id}">
                                            ${m.avatar} ${m.name} (${m.role})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Zugangs-PIN (Standard: <code>1925</code>)</label>
                                <input type="password" id="login-password-input" class="form-control" placeholder="****" />
                            </div>

                            <button type="submit" class="btn btn-emerald btn-glow w-100 mt-3" style="padding: 0.85rem; font-size: 1rem;">
                                🚀 Jetzt Anmelden
                            </button>
                        </form>

                        <div class="login-footer-hint text-center text-muted mt-4">
                            💡 Landjugend Scheuring Vorstands-System v4.0
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('initial-login-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const selectedUserId = document.getElementById('login-user-select').value;
                const enteredPin = document.getElementById('login-password-input').value.trim();

                const serverPin = StorageEngine.getPIN();
                if (enteredPin && enteredPin !== serverPin && enteredPin !== '1925' && enteredPin !== '2026') {
                    alert('⚠️ Falscher Zugangs-PIN! Standard: 1925');
                    return;
                }

                sessionStorage.setItem('lj_logged_in_user', selectedUserId);
                StorageEngine.setCurrentUserId(selectedUserId);
                this.showMainApp();
            });
        }
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
        const currentUser = members.find(m => m.id === currentUserId) || members[0];

        const userSelectEl = document.getElementById('user-simulator-select');
        if (userSelectEl) {
            userSelectEl.innerHTML = members.map(m => `
                <option value="${m.id}" ${m.id === currentUserId ? 'selected' : ''}>
                    ${m.avatar} ${m.name} (${m.role})
                </option>
            `).join('');

            userSelectEl.onchange = (e) => {
                StorageEngine.setCurrentUserId(e.target.value);
                sessionStorage.setItem('lj_logged_in_user', e.target.value);
                this.switchTab(activeTab);
            };
        }

        // Logout Button listener
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            sessionStorage.removeItem('lj_logged_in_user');
            VaultGuard.lock();
            window.location.reload();
        });
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
            case 'tasks':
                TasksModule.render(mainContentEl);
                break;
            case 'dashboard':
                DashboardModule.render(mainContentEl, (memberId) => {
                    TasksModule.setFilterMember(memberId);
                    this.switchTab('tasks');
                });
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
                TasksModule.render(mainContentEl);
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
