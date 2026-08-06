/**
 * Main Application Orchestrator & View Controller (Bright Friendly Light Theme & Compact Navigation Drawer)
 */
import { StorageEngine, escapeHTML } from './storage.js';
import { CloudStorageEngine } from './cloud-storage.js';

import { AppAuth } from './modules/auth.js';
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
        // Pre-fetch and synchronize cloud data immediately on page load
        CloudStorageEngine.init(() => {
            if (AppAuth.isAuthenticated()) {
                this.switchTab(activeTab);
            }
        });

        const mainContentEl = document.getElementById('main-content-view');

        // Level-1 App Entry Authentication Check (Username + Password)
        if (!AppAuth.isAuthenticated()) {
            if (mainContentEl) {
                AppAuth.renderEntryLockPage(mainContentEl, () => {
                    this.startApp();
                });
            }
            return;
        }

        this.startApp();
    }

    static startApp() {
        const headerEl = document.querySelector('.app-header');
        if (headerEl) headerEl.style.display = 'block';

        this.bindGlobalEvents();
        this.switchTab(activeTab);
    }

    static isUserAuthorizedForVault(userId) {
        const members = StorageEngine.getMembers();
        const currentUser = members.find(m => m.id === userId);
        if (!currentUser) return false;

        const role = (currentUser.role || '').toLowerCase();
        // Authorized roles: Vorstand, Kassier, Schriftführer
        const authorizedKeywords = ['vorstand', 'kassier', 'schriftführer', 'schriftfuehrer'];
        return authorizedKeywords.some(kw => role.includes(kw));
    }

    static bindGlobalEvents() {
        // Open Navigation Drawer on Hamburger Menu Click
        document.getElementById('open-nav-drawer-btn')?.addEventListener('click', () => {
            this.openNavDrawer();
        });

        // Side-by-side Action Buttons
        document.getElementById('export-excel-btn')?.addEventListener('click', () => {
            StorageEngine.exportExcelDashboard();
        });

        document.getElementById('import-backup-btn')?.addEventListener('click', () => {
            this.openBackupModal();
        });
    }

    static openNavDrawer() {
        document.body.style.overflow = 'hidden';
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active nav-drawer-backdrop';

        const members = StorageEngine.getMembers();
        const currentUserId = StorageEngine.getCurrentUserId();
        const currentUser = members.find(m => m.id === currentUserId) || { name: 'Mitglied', avatar: '👤', role: 'Beisitzer', color: '#00873D' };

        const isVaultAuthorized = this.isUserAuthorizedForVault(currentUserId);
        const isAdmin = StorageEngine.isSuperAdmin(currentUserId);

        const tabItems = [
            { id: 'tasks', name: 'Aufgaben-Verwaltung', icon: '✅' },
            { id: 'dashboard', name: 'Vorstands-Dashboard', icon: '📊' },
            { id: 'finance', name: 'Finanzen & Kassenbuch 🔒', icon: '💰', protected: true },
            { id: 'contracts', name: 'Verträge & Sponsoring 🔒', icon: '📋', protected: true },
            { id: 'minutes', name: 'Sitzungen & KI-Audio 🔒', icon: '🎙️', protected: true },
            { id: 'settings', name: 'Einstellungen (Admin)', icon: '⚙️', adminOnly: true },
            { id: 'password', name: 'Passwort ändern', icon: '🔑' }
        ];

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card nav-drawer-card" style="max-width: 360px; width: 90vw; padding: 0;">
                <div class="modal-header d-flex align-items-center justify-content-between p-2.5" style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                    <h3 style="font-size: 1rem; color: #0f172a; margin: 0; font-weight: 800;">Navigation</h3>
                    <button class="btn btn-ghost modal-close modal-close-x" style="font-size: 1.4rem; line-height: 1; padding: 0.1rem 0.5rem;">&times;</button>
                </div>

                <div class="modal-body p-2.5" style="max-height: 75vh; overflow-y: auto;">
                    <!-- Single-Line Navigation Items List -->
                    <div class="drawer-nav-list d-flex flex-column gap-1">
                        ${tabItems.map(item => {
                            if (item.protected && !isVaultAuthorized) return '';
                            if (item.adminOnly && !isAdmin) return '';
                            const isActive = activeTab === item.id;
                            return `
                                <button class="btn nav-drawer-item-compact ${isActive ? 'active' : ''}" data-drawer-tab="${item.id}">
                                    <div class="d-flex align-items-center gap-2">
                                        <span style="font-size: 1.1rem;">${item.icon}</span>
                                        <span style="font-size: 0.88rem; font-weight: 600;">${item.name}</span>
                                    </div>
                                    ${isActive ? '<span class="badge badge-success" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">Aktiv</span>' : '<span style="color: #94a3b8;">›</span>'}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="modal-footer p-2 d-flex align-items-center justify-content-end" style="border-top: 1px solid #e2e8f0; background: #f8fafc;">
                    <button class="btn btn-sm btn-ghost danger-text font-bold w-100" id="drawer-logout-btn" style="font-size: 0.85rem; padding: 0.4rem;">
                        🚪 Abmelden
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Handle navigation item click from inside drawer
        modal.querySelectorAll('[data-drawer-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.drawerTab;
                closeModal();
                this.handleTabClick(targetTab);
            });
        });

        // Logout action
        modal.querySelector('#drawer-logout-btn')?.addEventListener('click', () => {
            closeModal();
            AppAuth.logout();
            this.init();
        });

        // User switcher inside drawer
        const drawerUserSelect = modal.querySelector('#drawer-user-select');
        if (drawerUserSelect) {
            drawerUserSelect.onchange = (e) => {
                const targetMemberId = e.target.value;
                const isCurrentAdmin = StorageEngine.isSuperAdmin(currentUserId);
                const isTargetAdmin = StorageEngine.isSuperAdmin(targetMemberId);
                const targetMember = members.find(m => m.id === targetMemberId);

                if (targetMemberId === currentUserId) return;

                if (isCurrentAdmin && !isTargetAdmin) {
                    StorageEngine.setCurrentUserId(targetMemberId);
                    closeModal();
                    this.switchTab(activeTab);
                    return;
                }

                drawerUserSelect.value = currentUserId;

                if (!targetMember) return;

                closeModal();
                AppAuth.promptUserSwitchAuth(
                    targetMember,
                    (authenticatedMember) => {
                        StorageEngine.setCurrentUserId(authenticatedMember.id);
                        this.switchTab(activeTab);
                    },
                    () => {}
                );
            };
        }
    }

    static openBackupModal() {
        document.body.style.overflow = 'hidden';
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 460px; width: 100%; border: 1px solid #00873D;">
                <div class="modal-header">
                    <h3 style="font-size: 1.05rem; color: #0f172a;">💾 Daten-Sicherung & Cloud-Transfer</h3>
                    <button class="btn btn-ghost modal-close modal-close-x">&times;</button>
                </div>
                <div class="modal-body p-3">
                    <p class="small text-muted mb-3">
                        Übertrage deine erstellten Aufgaben, Kassenbucheinträge & Verträge zwischen deinem Rechner und der Online-Webapplikation.
                    </p>

                    <div class="d-flex flex-column gap-2 mb-2">
                        <button class="btn btn-emerald w-100 p-2 font-bold" id="backup-download-action">
                            💾 1. Lokale Aufgaben herunterladen (.json)
                        </button>

                        <button class="btn btn-primary w-100 p-2 font-bold" id="push-cloud-now-action" style="background: #00873D; border-color: #00873D;">
                            ⚡ 2. Aktuelle Aufgaben JETZT live in die Cloud pushen
                        </button>

                        <div class="p-3 border rounded" style="background: #f8fafc; border-color: #cbd5e1 !important;">
                            <label class="form-label small text-emerald font-bold mb-2">📤 3. Sicherungsdatei hochladen & freigeben:</label>
                            <input type="file" id="backup-upload-input" accept=".json" class="form-control form-control-sm" />
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.querySelector('.modal-close-x').onclick = closeModal;

        modal.querySelector('#backup-download-action').onclick = () => {
            StorageEngine.exportFullBackupJSON();
        };

        modal.querySelector('#push-cloud-now-action').onclick = async () => {
            await CloudStorageEngine.pushAllToCloud();
            alert('🚀 Alle deinen aktuellen Aufgaben wurden erfolgreich live in die Cloud hochgeladen!');
            closeModal();
        };

        modal.querySelector('#backup-upload-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const res = StorageEngine.importFullBackupJSON(event.target.result);
                if (res.success) {
                    alert('✅ Deine Aufgaben wurden erfolgreich importiert!');
                    closeModal();
                    this.switchTab(activeTab);
                } else {
                    alert('❌ Fehler beim Importieren: ' + res.error);
                }
            };
            reader.readAsText(file);
        };
    }

    static handleTabClick(targetTab) {
        if (!AppAuth.isAuthenticated()) {
            this.init();
            return;
        }

        const currentUserId = StorageEngine.getCurrentUserId();

        // Settings Tab: Only accessible to Moritz Kubik (Admin)
        if (targetTab === 'settings') {
            if (!StorageEngine.isSuperAdmin(currentUserId)) {
                alert('🔒 Zugriffsverweigerung: Die Einstellungen sind ausschließlich für den Admin (Moritz Kubik) reserviert.');
                return;
            }
            this.switchTab('settings');
            return;
        }

        // Password change tab
        if (targetTab === 'password') {
            this.switchTab('password');
            return;
        }

        const protectedTabs = ['finance', 'contracts', 'minutes'];

        if (protectedTabs.includes(targetTab)) {
            if (!this.isUserAuthorizedForVault(currentUserId)) {
                alert('🔒 Zugriffsverweigerung: Nur Vorstände, Kassiere und Schriftführer dürfen diesen Bereich einsehen.');
                return;
            }

            if (VaultGuard.isUnlocked()) {
                this.switchTab(targetTab);
            } else {
                const names = {
                    finance: '💰 Finanzen & Kassenbuch',
                    contracts: '📋 Verträge & Sponsoring',
                    minutes: '🎙️ Sitzungsprotokolle & Audio-Aufnahme'
                };
                activeTab = targetTab;
                const mainContentEl = document.getElementById('main-content-view');
                if (mainContentEl) {
                    VaultGuard.renderPinLockPage(mainContentEl, names[targetTab], () => {
                        this.switchTab(targetTab);
                    });
                }
            }
        } else {
            this.switchTab(targetTab);
        }
    }

    static renderPageHeader(containerEl, title, subtitle) {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'page-view-header';
        headerDiv.innerHTML = `
            <h2>${title}</h2>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
        `;
        containerEl.appendChild(headerDiv);
    }

    static switchTab(tabName) {
        const protectedTabs = ['finance', 'contracts', 'minutes'];
        const isLeavingProtected = protectedTabs.includes(activeTab) && !protectedTabs.includes(tabName);
        
        activeTab = tabName;

        if (isLeavingProtected) {
            VaultGuard.lock();
        }

        const mainContentEl = document.getElementById('main-content-view');
        if (!mainContentEl) return;

        mainContentEl.innerHTML = '';

        const titles = {
            tasks: { title: '✅ Aufgaben-Verwaltung', sub: 'Übersicht & Bearbeitung aller Vorstandsaufgaben' },
            dashboard: { title: '📊 Vorstands-Dashboard', sub: 'Erfüllungsgrad (%) & Fortschritt pro Mitglied' },
            finance: { title: '💰 Finanzen & Kassenbuch 🔒', sub: 'Transaktions-Journal, Belege & Einnahmen/Ausgaben' },
            contracts: { title: '📋 Verträge & Sponsoring 🔒', sub: 'Vereinsdokumente, Pachtverträge & Vereinbarungen' },
            minutes: { title: '🎙️ Sitzungen & KI-Audio 🔒', sub: 'Protokollarchiv & KI-Sprachaufnahme' },
            settings: { title: '⚙️ Vorstands-Einstellungen (Admin)', sub: 'Verwaltung von Vorstandsmitgliedern & Aufgaben-Kategorien' },
            password: { title: '🔑 Passwort ändern', sub: 'Persönliches Zugangspasswort anpassen' }
        };

        const pageInfo = titles[tabName] || titles.tasks;
        this.renderPageHeader(mainContentEl, pageInfo.title, pageInfo.sub);

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
                    this.switchTab('settings');
                });
                break;
            case 'password':
                this.renderPasswordChangeView(mainContentEl);
                break;
            default:
                TasksModule.render(mainContentEl);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    static renderPasswordChangeView(containerEl) {
        const currentUserId = StorageEngine.getCurrentUserId();
        const members = StorageEngine.getMembers();
        const currentUser = members.find(m => m.id === currentUserId) || { name: 'Mitglied', avatar: '👤' };

        const wrapper = document.createElement('div');
        wrapper.className = 'password-change-wrapper p-3';

        wrapper.innerHTML = `
            <div class="card-glow p-4" style="max-width: 440px; margin: 0 auto;">
                <div class="text-center mb-3">
                    <span style="font-size: 2rem; background: #f8fafc; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: 2px solid ${currentUser.color || '#00873D'}">
                        ${currentUser.avatar}
                    </span>
                    <h3 style="font-size: 1.15rem; color: #0f172a; margin-top: 8px;">${escapeHTML(currentUser.name)}</h3>
                    <small style="color: #00873D; font-weight: bold;">${escapeHTML(currentUser.role)}</small>
                </div>

                <form id="change-my-password-form" autocomplete="off">
                    <div class="form-group mb-3">
                        <label class="form-label small font-bold text-muted mb-1">Aktuelles Passwort *</label>
                        <input type="password" id="cur-pass-input" class="form-control" placeholder="Aktuelles Passwort eingeben..." required autofocus autocomplete="off" />
                    </div>

                    <div class="form-group mb-3">
                        <label class="form-label small font-bold text-muted mb-1">Neues Passwort *</label>
                        <input type="password" id="new-pass-input" class="form-control" placeholder="Neues Passwort eingeben..." required autocomplete="off" />
                    </div>

                    <div class="form-group mb-3">
                        <label class="form-label small font-bold text-muted mb-1">Neues Passwort wiederholen *</label>
                        <input type="password" id="confirm-pass-input" class="form-control" placeholder="Passwort wiederholen..." required autocomplete="off" />
                    </div>

                    <div id="pass-change-msg" class="mb-3 hidden small font-bold text-center"></div>

                    <button type="submit" class="btn btn-emerald w-100" style="padding: 0.65rem; font-weight: bold;">
                        💾 Neues Passwort Speichern
                    </button>
                </form>
            </div>
        `;

        containerEl.appendChild(wrapper);

        const form = wrapper.querySelector('#change-my-password-form');
        const curPassInput = wrapper.querySelector('#cur-pass-input');
        const newPassInput = wrapper.querySelector('#new-pass-input');
        const confirmPassInput = wrapper.querySelector('#confirm-pass-input');
        const msgEl = wrapper.querySelector('#pass-change-msg');

        setTimeout(() => curPassInput?.focus(), 50);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const curVal = curPassInput.value.trim();
            const newVal = newPassInput.value.trim();
            const confirmVal = confirmPassInput.value.trim();

            const actualPassHash = StorageEngine.getMemberPassword(currentUserId);
            const hashedCurVal = await StorageEngine.hashPassword(curVal);

            if (actualPassHash && hashedCurVal !== actualPassHash) {
                msgEl.className = 'mb-3 small font-bold text-center text-danger';
                msgEl.textContent = '⚠️ Das aktuelle Passwort ist falsch!';
                return;
            }

            if (newVal.length < 4) {
                msgEl.className = 'mb-3 small font-bold text-center text-danger';
                msgEl.textContent = '⚠️ Das neue Passwort muss mindestens 4 Zeichen lang sein!';
                return;
            }

            if (newVal !== confirmVal) {
                msgEl.className = 'mb-3 small font-bold text-center text-danger';
                msgEl.textContent = '⚠️ Die neuen Passwörter stimmen nicht überein!';
                return;
            }

            await StorageEngine.setMemberPassword(currentUserId, newVal);
            CloudStorageEngine.pushAllToCloud();

            msgEl.className = 'mb-3 small font-bold text-center text-success';
            msgEl.textContent = '✅ Dein Passwort wurde erfolgreich geändert!';
            curPassInput.value = '';
            newPassInput.value = '';
            confirmPassInput.value = '';
        });
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
