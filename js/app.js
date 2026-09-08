/**
 * Main Application Orchestrator (Next-Gen Executive Standard)
 */
import { StorageEngine, escapeHTML } from './storage.js';
import { TasksModule } from './modules/tasks.js';
import { DashboardModule } from './modules/dashboard.js';
import { VaultGuard } from './modules/vault.js';
import { FinanceModule } from './modules/finance.js';
import { ContractsModule } from './modules/contracts.js';
import { MinutesModule } from './modules/minutes.js';
import { SettingsModule } from './modules/settings.js';
import { PdfReportModule } from './modules/pdf_report.js';
import { AutoSaveEngine } from './modules/autosave.js';
import { CloudStorageEngine } from './cloud-storage.js';
import { AppAuth } from './modules/auth.js';

let activeTab = 'dashboard';
let pendingProtectedTab = null;

class App {
    static init() {
        // Protected area (Finanzen, Verträge, Protokolle) is strictly locked by default
        VaultGuard.lock();

        if (!AppAuth.isCentralUnlocked()) {
            AppAuth.renderCentralLockScreen(document.body, () => {
                VaultGuard.lock(); // Ensure strictly locked after master login
                AppAuth.promptUserSelection(document.body, () => {
                    this.showMainApp();
                });
            });
        } else {
            this.showMainApp();
        }
    }

    static showMainApp() {
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = 'flex';
        this.renderNavbar();
        this.bindGlobalEvents();
        AutoSaveEngine.init();
        CloudStorageEngine.init(() => {
            this.switchTab(activeTab);
        });
        this.switchTab(activeTab);
    }

    static renderNavbar() {
        const members = StorageEngine.getMembers();
        const currentUserId = StorageEngine.getCurrentUserId();
        const currentUser = members.find(m => m.id === currentUserId) || members[0];

        // Update Topbar User Selector Button Display
        const avatarEl = document.getElementById('current-user-avatar');
        const nameEl = document.getElementById('current-user-name');
        const roleEl = document.getElementById('current-user-role');

        if (currentUser) {
            if (avatarEl) avatarEl.textContent = currentUser.avatar || '👤';
            if (nameEl) nameEl.textContent = currentUser.name || 'Vorstand';
            if (roleEl) {
                roleEl.textContent = currentUser.role || 'Landjugend Scheuring';
                roleEl.style.color = currentUser.color || '#10b981';
            }
        }

        // Populate In-App Expandable Dropdown List
        const listEl = document.getElementById('user-selector-list');
        const menuEl = document.getElementById('user-selector-menu');
        const caretEl = document.getElementById('user-selector-caret');

        if (listEl) {
            listEl.innerHTML = members.map(m => `
                <div class="user-selector-item ${m.id === currentUserId ? 'active' : ''}" data-user-id="${m.id}" style="cursor: pointer; padding: 0.55rem 0.75rem; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; transition: background 0.15s; background: ${m.id === currentUserId ? 'rgba(16, 185, 129, 0.08)' : 'transparent'};">
                    <div style="display: flex; align-items: center; gap: 0.6rem; overflow: hidden;">
                        <span style="font-size: 1.2rem; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: ${m.color}18; color: ${m.color}; border-radius: 8px; border: 1.5px solid ${m.color}40; flex-shrink: 0;">${m.avatar}</span>
                        <div style="overflow: hidden;">
                            <span style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(m.name)}</span>
                            <span style="font-size: 0.74rem; color: ${m.color}; font-weight: 700; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(m.role)}</span>
                        </div>
                    </div>
                    ${m.id === currentUserId ? `<span style="color: var(--donezo-green); font-weight: 800; font-size: 1rem;">✓</span>` : ''}
                </div>
            `).join('');

            listEl.querySelectorAll('.user-selector-item[data-user-id]').forEach(item => {
                item.addEventListener('click', (e) => {
                    const uid = e.currentTarget.dataset.userId;
                    StorageEngine.setCurrentUserId(uid);
                    menuEl?.classList.add('hidden');
                    if (caretEl) caretEl.textContent = '▾';
                    this.renderNavbar();
                    this.switchTab(activeTab);
                });
            });
        }

        // Toggle Expand/Collapse Dropdown
        const triggerEl = document.getElementById('user-selector-trigger');
        if (triggerEl && !triggerEl._hasClickListener) {
            triggerEl._hasClickListener = true;
            triggerEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menuEl?.classList.toggle('hidden');
                if (caretEl) {
                    caretEl.textContent = isHidden ? '▾' : '▲';
                }
            });
        }

        // Update Sidebar Active Task Counter
        const taskCounterEl = document.getElementById('sidebar-task-counter');
        if (taskCounterEl) {
            const openCount = StorageEngine.getTasks().filter(t => t.status !== 'erledigt').length;
            taskCounterEl.textContent = `${openCount}+`;
        }

        this.renderProtectedSidebar();
    }

    static renderProtectedSidebar() {
        const container = document.getElementById('sidebar-protected-nav');
        if (!container) return;

        const isUnlocked = VaultGuard.isUnlockedSync();

        if (isUnlocked) {
            container.innerHTML = `
                <button class="sidebar-nav-link ${activeTab === 'finance' ? 'active' : ''}" data-tab="finance">
                    <span class="nav-icon">💰</span>
                    <span class="nav-title">Finanzen & Kassenbuch</span>
                </button>
                <button class="sidebar-nav-link ${activeTab === 'contracts' ? 'active' : ''}" data-tab="contracts">
                    <span class="nav-icon">📄</span>
                    <span class="nav-title">Verträge & Sponsoring</span>
                </button>
                <button class="sidebar-nav-link ${activeTab === 'minutes' ? 'active' : ''}" data-tab="minutes">
                    <span class="nav-icon">🎙️</span>
                    <span class="nav-title">Sitzungen & Audio</span>
                </button>
                <button class="sidebar-nav-link text-danger mt-1" id="sidebar-lock-btn" style="color: #f87171 !important;">
                    <span class="nav-icon">🔒</span>
                    <span class="nav-title">Bereich sperren</span>
                </button>
            `;

            container.querySelector('#sidebar-lock-btn')?.addEventListener('click', () => {
                VaultGuard.lock();
                this.renderNavbar();
                this.switchTab('dashboard');
            });
        } else {
            container.innerHTML = `
                <button class="sidebar-nav-link ${activeTab === 'vault-login' ? 'active' : ''}" data-tab="vault-login">
                    <span class="nav-icon">🔒</span>
                    <span class="nav-title">Geschützter Bereich</span>
                </button>
            `;
        }

        // Re-bind click handlers for dynamic protected links
        container.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.handleTabClick(targetTab);
            });
        });
    }

    static bindGlobalEvents() {
        // Sidebar Navigation Links (Static main & system tabs)
        document.querySelectorAll('.sidebar-nav:not(#sidebar-protected-nav) .sidebar-nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.handleTabClick(targetTab);
            });
        });

        // Lock / Logout Central App Button
        document.getElementById('lock-app-btn')?.addEventListener('click', () => {
            VaultGuard.lock();
            AppAuth.lockCentral(document.body, () => {
                VaultGuard.lock();
                AppAuth.promptUserSelection(document.body, () => {
                    this.showMainApp();
                });
            });
        });

        // Backup & Reset Buttons
        document.getElementById('export-backup-btn')?.addEventListener('click', () => {
            PdfReportModule.openPdfOverview();
        });

        document.getElementById('reset-data-btn')?.addEventListener('click', () => {
            if (confirm('Achtung: Auf Standarddaten zurücksetzen? Alle Änderungen gehen verloren.')) {
                StorageEngine.resetToDefaults();
            }
        });

        // Custom Navigation Event from Dashboard Cards
        window.addEventListener('nav-to-tab', (e) => {
            if (e.detail && e.detail.tab) {
                if (e.detail.filterStatus !== undefined) {
                    TasksModule.setFilterStatus(e.detail.filterStatus);
                }
                if (e.detail.filterMember !== undefined) {
                    TasksModule.setFilterMember(e.detail.filterMember);
                }
                if (e.detail.filterCategory !== undefined) {
                    TasksModule.setFilterCategory(e.detail.filterCategory);
                }
                if (e.detail.filterDue !== undefined) {
                    TasksModule.setFilterDue(e.detail.filterDue);
                }
                this.handleTabClick(e.detail.tab);
                if (e.detail.openTaskId) {
                    setTimeout(() => {
                        const mainContentEl = document.getElementById('main-content-view');
                        TasksModule.openTaskModal(e.detail.openTaskId, mainContentEl);
                    }, 60);
                }
            }
        });

        // Close In-App User Selector on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#user-selector-container')) {
                const menuEl = document.getElementById('user-selector-menu');
                if (menuEl && !menuEl.classList.contains('hidden')) {
                    menuEl.classList.add('hidden');
                    const caretEl = document.getElementById('user-selector-caret');
                    if (caretEl) caretEl.textContent = '▾';
                }
            }
        });
    }

    static handleTabClick(targetTab) {
        const protectedTabs = ['finance', 'contracts', 'minutes'];

        if (targetTab === 'vault-login') {
            if (VaultGuard.isUnlockedSync()) {
                this.switchTab('finance');
            } else {
                this.switchTab('vault-login');
            }
        } else if (protectedTabs.includes(targetTab)) {
            if (VaultGuard.isUnlockedSync()) {
                this.switchTab(targetTab);
            } else {
                pendingProtectedTab = targetTab;
                this.switchTab('vault-login');
            }
        } else {
            this.switchTab(targetTab);
        }
    }

    static switchTab(tabName) {
        activeTab = tabName;
        this.renderProtectedSidebar();

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
            'vault-login': '🔒 Geschützter Bereich – Anmeldeseite',
            finance: '💰 Finanzen & Kassenbuch',
            contracts: '📄 Verträge & Sponsoring',
            minutes: '🎙️ Sitzungen, Audio & Protokolle',
            settings: '⚙️ Einstellungen & System-Verwaltung'
        };
        if (viewTitleEl) {
            viewTitleEl.textContent = titleMap[tabName] || 'Vorstands-Zentrale';
        }

        const mainContentEl = document.getElementById('main-content-view');
        if (!mainContentEl) return;

        mainContentEl.innerHTML = '';

        try {
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
                case 'vault-login':
                    VaultGuard.renderLoginPage(mainContentEl, () => {
                        const target = pendingProtectedTab || 'finance';
                        pendingProtectedTab = null;
                        this.renderNavbar();
                        this.switchTab(target);
                    });
                    break;
                case 'finance':
                    if (!VaultGuard.isUnlockedSync()) {
                        pendingProtectedTab = 'finance';
                        this.switchTab('vault-login');
                        return;
                    }
                    FinanceModule.render(mainContentEl);
                    this.bindVaultRelockBtn(mainContentEl);
                    break;
                case 'contracts':
                    if (!VaultGuard.isUnlockedSync()) {
                        pendingProtectedTab = 'contracts';
                        this.switchTab('vault-login');
                        return;
                    }
                    ContractsModule.render(mainContentEl);
                    this.bindVaultRelockBtn(mainContentEl);
                    break;
                case 'minutes':
                    if (!VaultGuard.isUnlockedSync()) {
                        pendingProtectedTab = 'minutes';
                        this.switchTab('vault-login');
                        return;
                    }
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
        } catch (err) {
            console.error('[App] Fehler beim Rendern von Tab ' + tabName, err);
            mainContentEl.innerHTML = `
                <div style="padding: 2.5rem; text-align: center; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2; margin: 2rem auto; max-width: 600px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h2 style="font-size: 1.4rem; color: #b91c1c; margin-bottom: 0.5rem;">Fehler beim Laden der Seite</h2>
                    <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1.5rem;">${escapeHTML(err.message)}</p>
                    <button class="btn btn-donezo-primary" onclick="window.location.reload()">🔄 Seite neu laden</button>
                </div>
            `;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    static bindVaultRelockBtn(containerEl) {
        const lockBtn = containerEl.querySelector('.lock-vault-btn');
        if (lockBtn) {
            lockBtn.addEventListener('click', () => {
                VaultGuard.lock();
                this.renderNavbar();
                this.switchTab('dashboard');
            });
        }
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
}
