/**
 * Main Application Orchestrator (Next-Gen Executive Standard)
 */
import { StorageEngine, escapeHTML } from './storage.js?v=54.1';
import { TasksModule } from './modules/tasks.js?v=54.1';
import { DashboardModule } from './modules/dashboard.js?v=54.1';
import { VaultGuard } from './modules/vault.js?v=54.1';
import { FinanceModule } from './modules/finance.js?v=54.1';
import { ContractsModule } from './modules/contracts.js?v=54.1';
import { MinutesModule } from './modules/minutes.js?v=54.1';
import { SettingsModule } from './modules/settings.js?v=54.1';
import { PdfReportModule } from './modules/pdf_report.js?v=54.1';
import { AutoSaveEngine } from './modules/autosave.js?v=54.1';
import { CloudStorageEngine } from './cloud-storage.js?v=54.1';
import { AppAuth } from './modules/auth.js?v=54.1';
import { SecurityUtils } from './utils/security.js?v=54.1';

let savedTab = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('lj_active_tab') : null;
const sensitiveTabsList = ['finance', 'contracts', 'minutes'];
if (sensitiveTabsList.includes(savedTab)) {
    savedTab = 'dashboard';
}
let activeTab = savedTab || 'dashboard';
let pendingProtectedTab = null;

class App {
    static init() {
        // Protected area (Finanzen, Verträge, Protokolle) is strictly locked by default
        VaultGuard.lock();

        if (!AppAuth.isCentralUnlocked()) {
            AppAuth.renderCentralLockScreen(document.body, () => {
                VaultGuard.lock(); // Ensure strictly locked after login
                this.showMainApp();
            });
        } else {
            this.showMainApp();
        }
    }

    static async showMainApp() {
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = 'flex';
        try {
            this.renderNavbar();
        } catch (e) {
            console.error('[App] renderNavbar error:', e);
        }
        try {
            this.bindGlobalEvents();
        } catch (e) {
            console.error('[App] bindGlobalEvents error:', e);
        }
        try {
            AutoSaveEngine.init();
        } catch (e) {
            console.error('[App] AutoSaveEngine error:', e);
        }

        // 1. Fetch authoritative live data directly from the online cloud database first
        CloudStorageEngine.updateStatus('syncing', '🔄 Lade Live-Daten aus der Cloud...');
        try {
            await CloudStorageEngine.pullAllFromCloud();
        } catch (e) {
            console.warn('Initial cloud fetch error:', e);
        }

        // 2. Render initial view with fresh online data
        try {
            this.renderNavbar();
        } catch (e) {
            console.error('[App] second renderNavbar error:', e);
        }
        try {
            this.switchTab(activeTab);
        } catch (e) {
            console.error('[App] switchTab error:', e);
        }

        // 3. Listen for live updates from other devices
        CloudStorageEngine.init(() => {
            this.renderNavbar();
            this.switchTab(activeTab);
        });
    }

    static renderNavbar() {
        const currentUser = StorageEngine.getLoggedInUser();

        // Update Topbar & Mobile User Selector Button Display
        const avatarEl = document.getElementById('current-user-avatar');
        const nameEl = document.getElementById('current-user-name');
        const roleEl = document.getElementById('current-user-role');
        const mobAvatarEl = document.getElementById('mobile-user-avatar');
        const mobNameEl = document.getElementById('mobile-user-name');

        if (currentUser) {
            if (avatarEl) {
                avatarEl.innerHTML = StorageEngine.renderMemberAvatar(currentUser, 28);
            }
            if (nameEl) nameEl.textContent = currentUser.name || 'Vorstand';
            if (roleEl) {
                let rolePrefix = '👤';
                if (currentUser.systemRole === 'superuser') rolePrefix = '👑 Superuser •';
                else if (currentUser.systemRole === 'admin') rolePrefix = '🛡️ Vorstand •';
                roleEl.textContent = `${rolePrefix} ${currentUser.role || 'Vorstand'}`;
                roleEl.style.color = currentUser.color || '#10b981';
            }
            if (mobAvatarEl) {
                mobAvatarEl.innerHTML = StorageEngine.renderMemberAvatar(currentUser, 28);
            }
            if (mobNameEl) {
                const firstName = (currentUser.name || 'Vorstand').split(' ')[0];
                mobNameEl.textContent = firstName;
            }
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

        const isAdmin = StorageEngine.isAdminOrSuperUser();
        const sectionLabel = document.getElementById('sidebar-protected-label') || container.previousElementSibling;

        // Strictly hide protected section from regular members (Beisitzer)
        if (!isAdmin) {
            container.innerHTML = '';
            container.style.display = 'none';
            if (sectionLabel && sectionLabel.classList.contains('nav-section-label')) {
                sectionLabel.style.display = 'none';
            }
            return;
        }

        // Admin / Superuser: ensure container and section label are visible
        container.style.display = '';
        if (sectionLabel && sectionLabel.classList.contains('nav-section-label')) {
            sectionLabel.style.display = '';
        }

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

        // Mobile User Chip Trigger (Navigate to settings on click)
        const mobUserChipBtn = document.getElementById('mobile-user-chip-btn');
        if (mobUserChipBtn && !mobUserChipBtn._hasListener) {
            mobUserChipBtn._hasListener = true;
            mobUserChipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu(false);
                this.handleTabClick('settings');
            });
        }

        // Lock / Logout Central App Button
        const handleLockApp = () => {
            VaultGuard.lock();
            AppAuth.lockCentral(document.body, () => {
                VaultGuard.lock();
                this.showMainApp();
            });
        };
        document.getElementById('lock-app-btn')?.addEventListener('click', handleLockApp);
        document.getElementById('mobile-lock-app-btn')?.addEventListener('click', () => {
            this.toggleMobileMenu(false);
            handleLockApp();
        });

        // Backup & PDF Overview Button
        const handlePdfOverview = () => {
            PdfReportModule.openPdfOverview();
        };
        document.getElementById('export-backup-btn')?.addEventListener('click', handlePdfOverview);
        document.getElementById('mobile-export-backup-btn')?.addEventListener('click', () => {
            this.toggleMobileMenu(false);
            handlePdfOverview();
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

        // Mobile Hamburger Menu & Menübalken Trigger Listeners
        const mobileToggleBtn = document.getElementById('mobile-menu-toggle-btn');
        if (mobileToggleBtn && !mobileToggleBtn._hasListener) {
            mobileToggleBtn._hasListener = true;
            mobileToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu();
            });
        }

        const menubalkenTrigger = document.getElementById('mobile-menubalken-trigger');
        if (menubalkenTrigger && !menubalkenTrigger._hasListener) {
            menubalkenTrigger._hasListener = true;
            menubalkenTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu();
            });
            menubalkenTrigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMobileMenu();
                }
            });
        }

        // Close mobile drawer on outside click
        document.addEventListener('click', (e) => {
            const sidebarNav = document.querySelector('.sidebar-nav');
            if (sidebarNav && sidebarNav.classList.contains('mobile-expanded')) {
                if (!e.target.closest('.app-sidebar')) {
                    this.toggleMobileMenu(false);
                }
            }
        });
    }

    static toggleMobileMenu(forceState = null) {
        const sidebarNav = document.querySelector('.sidebar-nav');
        const mobileToggleBtn = document.getElementById('mobile-menu-toggle-btn');
        const menubalkenTrigger = document.getElementById('mobile-menubalken-trigger');
        const menubalkenArrow = document.getElementById('menubalken-arrow');
        if (!sidebarNav) return;

        const isCurrentlyOpen = sidebarNav.classList.contains('mobile-expanded');
        const nextState = forceState !== null ? forceState : !isCurrentlyOpen;

        sidebarNav.classList.toggle('mobile-expanded', nextState);

        if (mobileToggleBtn) {
            const iconEl = mobileToggleBtn.querySelector('.hamburger-icon') || mobileToggleBtn;
            iconEl.textContent = nextState ? '✕' : '☰';
            mobileToggleBtn.classList.toggle('active', nextState);
        }

        if (menubalkenTrigger) {
            menubalkenTrigger.classList.toggle('is-open', nextState);
            menubalkenTrigger.setAttribute('aria-expanded', nextState ? 'true' : 'false');
        }

        if (menubalkenArrow) {
            menubalkenArrow.textContent = nextState ? '▲' : '▾';
        }
    }

    static handleTabClick(targetTab) {
        // Automatically collapse mobile menu drawer on tab switch
        this.toggleMobileMenu(false);

        const protectedTabs = ['finance', 'contracts', 'minutes', 'vault-login'];

        // Strictly block regular members from protected areas
        if (protectedTabs.includes(targetTab) && !StorageEngine.isAdminOrSuperUser()) {
            this.switchTab('dashboard');
            return;
        }

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
        const protectedTabs = ['finance', 'contracts', 'minutes', 'vault-login'];
        if (protectedTabs.includes(tabName) && !StorageEngine.isAdminOrSuperUser()) {
            tabName = 'dashboard';
        }

        activeTab = tabName;
        if (typeof sessionStorage !== 'undefined' && ['dashboard', 'tasks', 'settings', 'vault-login'].includes(tabName)) {
            sessionStorage.setItem('lj_active_tab', tabName);
        }
        this.renderProtectedSidebar();

        // Always ensure mobile menu is closed when switching views
        this.toggleMobileMenu(false);

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

        // Update Mobile Menübalken Active Label
        const menubalkenNameEl = document.getElementById('menubalken-active-name');
        const menubalkenMap = {
            dashboard: '📊 Dashboard',
            tasks: '📌 Aufgaben & To-Dos',
            'vault-login': '🔒 Geschützter Bereich',
            finance: '💰 Finanzen & Kassenbuch',
            contracts: '📄 Verträge & Sponsoring',
            minutes: '🎙️ Sitzungen & Protokolle',
            settings: '⚙️ Einstellungen'
        };
        if (menubalkenNameEl) {
            menubalkenNameEl.textContent = menubalkenMap[tabName] || '📊 Dashboard';
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
