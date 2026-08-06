/**
 * Main Application Orchestrator & View Controller (Smooth Navigation & Sleek Navigation Drawer)
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
        this.updateHeaderActivePill();
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

    static updateHeaderActivePill() {
        const badgeEl = document.getElementById('header-active-view-badge');
        if (!badgeEl) return;

        const titles = {
            tasks: { icon: '✅', name: 'Aufgaben' },
            dashboard: { icon: '📊', name: 'Dashboard' },
            finance: { icon: '💰', name: 'Finanzen' },
            contracts: { icon: '📋', name: 'Verträge' },
            minutes: { icon: '🎙️', name: 'Sitzungen & Audio' },
            settings: { icon: '⚙️', name: 'Einstellungen' },
            password: { icon: '🔑', name: 'Passwort ändern' }
        };

        const current = titles[activeTab] || titles.tasks;
        badgeEl.innerHTML = `<span class="view-icon">${current.icon}</span> <span class="view-title">${current.name}</span>`;
    }

    static bindGlobalEvents() {
        // Open Navigation Drawer on Hamburger Menu Click
        document.getElementById('open-nav-drawer-btn')?.addEventListener('click', () => {
            this.openNavDrawer();
        });

        // Desktop Action Buttons (Side-by-side backup/import & Excel export)
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
            { id: 'tasks', name: 'Aufgaben', icon: '✅', desc: 'Zentrale Aufgabenliste' },
            { id: 'dashboard', name: 'Dashboard', icon: '📊', desc: 'Vorstands-Fortschritte (%)' },
            { id: 'finance', name: 'Finanzen 🔒', icon: '💰', desc: 'Kassenbuch & Belegnachweis', protected: true },
            { id: 'contracts', name: 'Verträge 🔒', icon: '📋', desc: 'Pacht & Sponsoring', protected: true },
            { id: 'minutes', name: 'Sitzungen & Audio 🔒', icon: '🎙️', desc: 'Protokolle & KI-Transkript', protected: true },
            { id: 'settings', name: 'Einstellungen (Admin)', icon: '⚙️', desc: 'Mitglieder & Kategorien', adminOnly: true },
            { id: 'password', name: 'Passwort ändern', icon: '🔑', desc: 'Persönliches Passwort' }
        ];

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card nav-drawer-card" style="max-width: 480px; width: 95vw; border: 1px solid rgba(0,135,61,0.4); box-shadow: 0 25px 60px rgba(0,0,0,0.9); padding: 0;">
                <div class="modal-header d-flex align-items-center justify-content-between p-3" style="border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3);">
                    <div class="d-flex align-items-center gap-2">
                        <img src="assets/logo_white.png" style="width: 28px; height: 28px; object-fit: contain;" />
                        <h3 style="font-size: 1.15rem; color: #fff; margin: 0; font-weight: 800;">Navigation & Menü</h3>
                    </div>
                    <button class="btn btn-ghost modal-close modal-close-x" style="font-size: 1.6rem; line-height: 1; padding: 0.2rem 0.6rem;">&times;</button>
                </div>

                <div class="modal-body p-3" style="max-height: 78vh; overflow-y: auto;">
                    <!-- User Profile & Switcher Box -->
                    <div class="p-3 mb-3 rounded d-flex align-items-center justify-content-between gap-2" style="background: rgba(0,0,0,0.4); border: 1px solid ${currentUser.color || '#00873D'}66;">
                        <div class="d-flex align-items-center gap-2">
                            <span style="font-size: 1.6rem; background: rgba(255,255,255,0.06); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid ${currentUser.color || '#00873D'};">
                                ${currentUser.avatar}
                            </span>
                            <div>
                                <strong style="color: #fff; display: block; font-size: 0.95rem;">${escapeHTML(currentUser.name)}</strong>
                                <small style="color: ${currentUser.color || '#34d399'}; font-weight: bold;">${escapeHTML(currentUser.role)}</small>
                            </div>
                        </div>

                        <select id="drawer-user-select" class="form-select form-select-sm" style="max-width: 140px; font-size: 0.82rem; background: rgba(0,0,0,0.5); font-weight: 600;">
                            ${members.map(m => `
                                <option value="${m.id}" ${m.id === currentUserId ? 'selected' : ''}>
                                    ${m.avatar} ${escapeHTML(m.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Navigation Items List -->
                    <h5 style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.6rem; font-weight: 700;">📌 BEREICHE WÄHLEN:</h5>
                    <div class="drawer-nav-list d-flex flex-column gap-2 mb-3">
                        ${tabItems.map(item => {
                            if (item.protected && !isVaultAuthorized) return '';
                            if (item.adminOnly && !isAdmin) return '';
                            const isActive = activeTab === item.id;
                            return `
                                <button class="btn nav-drawer-item p-2.5 rounded text-start d-flex align-items-center justify-content-between ${isActive ? 'active' : ''}" 
                                        data-drawer-tab="${item.id}"
                                        style="${isActive 
                                            ? 'background: rgba(0, 135, 61, 0.25); border: 1px solid #00873D; color: #34d399;' 
                                            : 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #e2e8f0;'}">
                                    <div class="d-flex align-items-center gap-2">
                                        <span style="font-size: 1.25rem;">${item.icon}</span>
                                        <div>
                                            <strong style="display: block; font-size: 0.95rem;">${item.name}</strong>
                                            <small style="color: var(--text-muted); font-size: 0.76rem;">${item.desc}</small>
                                        </div>
                                    </div>
                                    ${isActive ? '<span class="badge badge-success">Aktiv</span>' : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <!-- SIDE-BY-SIDE EXPORT & BACKUP BUTTONS (Exact user requirement!) -->
                    <h5 style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.6rem; font-weight: 700; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.8rem;">💾 DATEN-AKTIONEN:</h5>
                    <div class="drawer-action-pair d-flex gap-2">
                        <button class="btn btn-sm btn-ghost text-nowrap flex-1 w-50 p-2 font-bold" id="drawer-import-backup-btn" style="border: 1px solid rgba(255,255,255,0.15); font-size: 0.85rem;">
                            💾 Sicherung / Import
                        </button>
                        <button class="btn btn-sm btn-emerald text-nowrap flex-1 w-50 p-2 font-bold" id="drawer-export-excel-btn" style="font-size: 0.85rem;">
                            📊 Export Excel
                        </button>
                    </div>
                </div>

                <div class="modal-footer p-3 d-flex align-items-center justify-content-between" style="border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3);">
                    <button class="btn btn-sm btn-ghost danger-text font-bold" id="drawer-logout-btn" style="font-size: 0.88rem;">
                        🚪 Abmelden
                    </button>
                    <button class="btn btn-sm btn-secondary modal-close p-2 font-bold" style="font-size: 0.88rem;">
                        ✖️ Menü Schließen
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

        // Bind Backup & Excel Export inside drawer
        modal.querySelector('#drawer-import-backup-btn')?.addEventListener('click', () => {
            closeModal();
            this.openBackupModal();
        });

        modal.querySelector('#drawer-export-excel-btn')?.addEventListener('click', () => {
            closeModal();
            StorageEngine.exportExcelDashboard();
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
            <div class="modal-card" style="max-width: 480px; width: 100%; border: 1px solid rgba(0,135,61,0.4);">
                <div class="modal-header">
                    <h3 style="font-size: 1.1rem; color: #fff;">💾 Daten-Sicherung & Cloud-Transfer</h3>
                    <button class="btn btn-ghost modal-close modal-close-x">&times;</button>
                </div>
                <div class="modal-body p-3">
                    <p class="small text-muted mb-3">
                        Übertrage deine erstellten Aufgaben, Kassenbucheinträge & Verträge zwischen deinem Rechner und der Online-Webapplikation.
                    </p>

                    <div class="d-flex flex-column gap-3 mb-2">
                        <button class="btn btn-emerald w-100 p-2 font-bold" id="backup-download-action">
                            💾 1. Lokale Aufgaben & Daten herunterladen (.json)
                        </button>

                        <button class="btn btn-primary w-100 p-2 font-bold" id="push-cloud-now-action" style="background: #00873D; border-color: #00873D;">
                            ⚡ 2. Aktuelle Laptop-Aufgaben JETZT live in die Cloud pushen
                        </button>

                        <div class="p-3 border rounded" style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1) !important;">
                            <label class="form-label small text-emerald font-bold mb-2">📤 3. Sicherungsdatei hochladen & für den Vorstand freigeben:</label>
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
            alert('🚀 Alle deinen aktuellen Laptop-Aufgaben wurden erfolgreich live in die Cloud hochgeladen!');
            closeModal();
        };

        modal.querySelector('#backup-upload-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const res = StorageEngine.importFullBackupJSON(event.target.result);
                if (res.success) {
                    alert('✅ Deine Aufgaben wurden erfolgreich importiert und live in die Cloud übertragen!');
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

        // Settings Tab: Only accessible to Moritz Kubik (Admin), opens immediately!
        if (targetTab === 'settings') {
            if (!StorageEngine.isSuperAdmin(currentUserId)) {
                alert('🔒 Zugriffsverweigerung: Die Einstellungen sind ausschließlich für den Admin (Moritz Kubik) reserviert.');
                return;
            }
            this.switchTab('settings');
            return;
        }

        // Password change tab: Opens immediately for logged-in user!
        if (targetTab === 'password') {
            this.switchTab('password');
            return;
        }

        const protectedTabs = ['finance', 'contracts', 'minutes'];

        if (protectedTabs.includes(targetTab)) {
            // Role Authorization Check
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
                this.updateHeaderActivePill();
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

    static switchTab(tabName) {
        const protectedTabs = ['finance', 'contracts', 'minutes'];
        const isLeavingProtected = protectedTabs.includes(activeTab) && !protectedTabs.includes(tabName);
        
        activeTab = tabName;
        this.updateHeaderActivePill();

        if (isLeavingProtected) {
            VaultGuard.lock();
        }

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
                    this.updateHeaderActivePill();
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

        containerEl.innerHTML = `
            <div class="password-change-wrapper p-3">
                <div class="section-banner settings-banner mb-4">
                    <div class="banner-title">
                        <h2>🔑 Passwort ändern</h2>
                        <p>Ändere dein persönliches Vereinspasswort für ${escapeHTML(currentUser.name)}.</p>
                    </div>
                </div>

                <div class="card-glow p-4" style="max-width: 480px; margin: 0 auto; border: 1px solid rgba(0,135,61,0.4);">
                    <div class="text-center mb-3">
                        <span style="font-size: 2.2rem; background: rgba(0,0,0,0.3); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: 2px solid ${currentUser.color || '#00873D'}">
                            ${currentUser.avatar}
                        </span>
                        <h3 style="font-size: 1.2rem; color: #fff; margin-top: 8px;">${escapeHTML(currentUser.name)}</h3>
                        <small style="color: ${currentUser.color || '#34d399'}; font-weight: bold;">${escapeHTML(currentUser.role)}</small>
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

                        <button type="submit" class="btn btn-emerald btn-glow w-100" style="padding: 0.7rem; font-weight: bold;">
                            💾 Neues Passwort Speichern
                        </button>
                    </form>
                </div>
            </div>
        `;

        const form = containerEl.querySelector('#change-my-password-form');
        const curPassInput = containerEl.querySelector('#cur-pass-input');
        const newPassInput = containerEl.querySelector('#new-pass-input');
        const confirmPassInput = containerEl.querySelector('#confirm-pass-input');
        const msgEl = containerEl.querySelector('#pass-change-msg');

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
                curPassInput.classList.add('shake');
                setTimeout(() => curPassInput.classList.remove('shake'), 500);
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
            msgEl.textContent = '✅ Dein Passwort wurde erfolgreich geändert! Das neue Passwort ist ab sofort aktiv.';
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
