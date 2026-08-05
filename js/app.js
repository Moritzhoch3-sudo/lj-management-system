/**
 * Main Application Orchestrator & View Controller (Smooth Navigation & Admin Settings Access)
 */
import { StorageEngine } from './storage.js';
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
        this.renderNavbar();
        this.bindGlobalEvents();
        this.updateNavbarTabVisibility();

        // Initialize Cloud Storage Realtime Engine
        CloudStorageEngine.init(() => {
            this.renderNavbar();
            this.updateNavbarTabVisibility();
            this.switchTab(activeTab);
        });

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

    static updateNavbarTabVisibility() {
        const currentUserId = StorageEngine.getCurrentUserId();
        const isVaultAuthorized = this.isUserAuthorizedForVault(currentUserId);
        const isAdmin = StorageEngine.isSuperAdmin(currentUserId);

        const protectedVaultTabs = ['finance', 'contracts', 'minutes'];

        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            const tab = link.dataset.tab;
            if (protectedVaultTabs.includes(tab)) {
                if (isVaultAuthorized) {
                    link.classList.remove('nav-tab-hidden');
                    link.classList.add('nav-tab-visible');
                } else {
                    link.classList.remove('nav-tab-visible');
                    link.classList.add('nav-tab-hidden');
                }
            } else if (tab === 'settings') {
                // Settings tab is ONLY visible to Admin (Moritz Kubik)
                if (isAdmin) {
                    link.classList.remove('nav-tab-hidden');
                    link.classList.add('nav-tab-visible');
                } else {
                    link.classList.remove('nav-tab-visible');
                    link.classList.add('nav-tab-hidden');
                }
            }
        });
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
                const targetMemberId = e.target.value;
                const currentUserId = StorageEngine.getCurrentUserId();
                const isCurrentAdmin = StorageEngine.isSuperAdmin(currentUserId);
                const isTargetAdmin = StorageEngine.isSuperAdmin(targetMemberId);
                const targetMember = members.find(m => m.id === targetMemberId);

                // If switching to current user (no change), do nothing
                if (targetMemberId === currentUserId) return;

                // Asymmetric logic:
                // If currently Admin AND switching to a non-admin (downgrading rights):
                // Instantly switch WITHOUT prompt!
                if (isCurrentAdmin && !isTargetAdmin) {
                    StorageEngine.setCurrentUserId(targetMemberId);
                    this.updateNavbarTabVisibility();
                    this.switchTab(activeTab);
                    return;
                }

                // Otherwise (switching back to Admin or between non-admin members): Prompt required!
                userSelectEl.value = currentUserId;

                if (!targetMember) return;

                AppAuth.promptUserSwitchAuth(
                    targetMember,
                    (authenticatedMember) => {
                        userSelectEl.value = authenticatedMember.id;
                        StorageEngine.setCurrentUserId(authenticatedMember.id);
                        this.updateNavbarTabVisibility();
                        this.switchTab(activeTab);
                    },
                    () => {
                        userSelectEl.value = currentUserId;
                    }
                );
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

        document.getElementById('export-excel-btn')?.addEventListener('click', () => {
            StorageEngine.exportExcelDashboard();
        });

        document.getElementById('import-backup-btn')?.addEventListener('click', () => {
            this.openBackupModal();
        });
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

                        <div class="p-3 border rounded" style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1) !important;">
                            <label class="form-label small text-emerald font-bold mb-2">📤 2. Sicherungsdatei hochladen & für den Vorstand freigeben:</label>
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
                document.querySelectorAll('.nav-link').forEach(link => {
                    if (link.dataset.tab === targetTab) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
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

        if (isLeavingProtected) {
            VaultGuard.lock();
        }

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
                    this.updateNavbarTabVisibility();
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
                        <p>Ändere dein persönliches Vereinspasswort für ${currentUser.name}.</p>
                    </div>
                </div>

                <div class="card-glow p-4" style="max-width: 480px; margin: 0 auto; border: 1px solid rgba(0,135,61,0.4);">
                    <div class="text-center mb-3">
                        <span style="font-size: 2.2rem; background: rgba(0,0,0,0.3); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: 2px solid ${currentUser.color || '#00873D'}">
                            ${currentUser.avatar}
                        </span>
                        <h3 style="font-size: 1.2rem; color: #fff; margin-top: 8px;">${currentUser.name}</h3>
                        <small style="color: ${currentUser.color || '#34d399'}; font-weight: bold;">${currentUser.role}</small>
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

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const curVal = curPassInput.value.trim();
            const newVal = newPassInput.value.trim();
            const confirmVal = confirmPassInput.value.trim();

            const actualPass = StorageEngine.getMemberPassword(currentUserId);

            if (curVal !== actualPass) {
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

            StorageEngine.setMemberPassword(currentUserId, newVal);
            msgEl.className = 'mb-3 small font-bold text-center text-success';
            msgEl.textContent = '✅ Dein Passwort wurde erfolgreich geändert! Das alte Passwort ist ab sofort ungültig.';
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
