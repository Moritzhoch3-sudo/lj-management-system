/**
 * Settings Module with Multi-User & Flexible Role Management
 * Supports Superuser Transfer, Role & System Role Separation, and Individual Member Passwords
 */
import { BOARD_ROLE_OPTIONS, SYSTEM_ROLE_OPTIONS } from '../data.js';
import { StorageEngine } from '../storage.js';
import { SecurityUtils } from '../utils/security.js';
import { AppAuth } from './auth.js';

const escapeHTML = SecurityUtils.escapeHTML.bind(SecurityUtils);
let activeSubTab = 'members'; // 'members', 'categories', 'security', 'my_account'

export class SettingsModule {
    static isSecurityUnlocked = true;

    static render(containerEl, onMembersUpdatedCallback) {
        try {
            const members = StorageEngine.getMembers() || [];
            const categories = StorageEngine.getCategories() || [];
            const loggedInUser = StorageEngine.getLoggedInUser();
            const isAdmin = StorageEngine.isAdminOrSuperUser();
            const isSuper = StorageEngine.isSuperUser();

            // Guard activeSubTab based on permissions
            if (!isAdmin && (activeSubTab === 'members' || activeSubTab === 'security')) {
                activeSubTab = 'my_account';
            }
            if (isAdmin && activeSubTab === 'my_account') {
                activeSubTab = 'members';
            }

            containerEl.innerHTML = `
                <div class="settings-wrapper w-100">
                    <!-- Unified Header Bar with Segmented Sub-Tab Switcher -->
                    <div class="card-glow p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <h2 class="m-0" style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">⚙️ Vorstands-Verwaltung & Einstellungen</h2>
                                <p class="text-muted m-0 mt-1" style="font-size: 0.88rem;">Benutzer-Accounts, Rollen, Kategorien und Bereichs-Sicherheit der Landjugend Scheuring</p>
                            </div>
                            
                            <!-- Segmented Pill Button Group matching Donezo design -->
                            <div class="settings-nav-pill-group">
                                ${isAdmin ? `
                                    <button type="button" class="sub-tab-btn ${activeSubTab === 'members' ? 'active' : ''}" data-subtab="members">
                                        👥 Mitglieder & Accounts (${members.length})
                                    </button>
                                    <button type="button" class="sub-tab-btn ${activeSubTab === 'categories' ? 'active' : ''}" data-subtab="categories">
                                        🏷️ Kategorien (${categories.length})
                                    </button>
                                    <button type="button" class="sub-tab-btn ${activeSubTab === 'security' ? 'active' : ''}" data-subtab="security">
                                        🔒 Sicherheit & Passwörter
                                    </button>
                                ` : `
                                    <button type="button" class="sub-tab-btn ${activeSubTab === 'my_account' ? 'active' : ''}" data-subtab="my_account">
                                        👤 Mein Account & Passwort
                                    </button>
                                    <button type="button" class="sub-tab-btn ${activeSubTab === 'categories' ? 'active' : ''}" data-subtab="categories">
                                        🏷️ Kategorien (${categories.length})
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- Render ONLY the Selected Sub-Page Content -->
                    <div class="sub-page-viewport">
                        ${this.renderSubPageContent(activeSubTab, members, categories, loggedInUser, isAdmin, isSuper)}
                    </div>
                </div>
            `;

            this.bindEvents(containerEl, members, categories, onMembersUpdatedCallback);
        } catch (err) {
            console.error('Error rendering SettingsModule:', err);
            containerEl.innerHTML = `
                <div class="card-glow p-4 text-center">
                    <h3 class="text-danger mb-2">⚠️ Fehler beim Laden der Einstellungen</h3>
                    <p class="text-muted">${escapeHTML(err.message || 'Unbekannter Fehler')}</p>
                    <button class="btn btn-primary btn-sm mt-3" onclick="window.location.reload()">🔄 Seite neu laden</button>
                </div>
            `;
        }
    }

    /**
     * Renders strictly ONLY the active sub-tab view
     */
    static renderSubPageContent(subTab, members, categories, loggedInUser, isAdmin, isSuper) {
        if (subTab === 'members' && isAdmin) {
            return `
                <div class="card-glow p-4">
                    <div class="toolbar-row d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <div>
                            <h3 class="m-0 font-size-md" style="font-weight: 800; font-size: 1.15rem;">👥 Vorstandsmitglieder & Accounts (${members.length} Personen)</h3>
                            <p class="text-muted m-0 mt-0.5" style="font-size: 0.82rem;">Verwalte Vereinsämter, @Benutzer-Logins, Passwörter und Berechtigungsstufen.</p>
                        </div>
                        <button class="btn btn-donezo-primary btn-sm" id="add-member-modal-trigger-btn">➕ Neues Mitglied anlegen</button>
                    </div>

                    <div class="settings-members-container">
                        <div class="settings-members-header">
                            <div class="sm-col-icon">Icon</div>
                            <div class="sm-col-name">Name</div>
                            <div class="sm-col-username">Login-Name</div>
                            <div class="sm-col-role">Amt / Position</div>
                            <div class="sm-col-system-role">System-Rechte</div>
                            <div class="sm-col-color text-center">Farbe</div>
                            <div class="sm-col-action text-center">Aktionen</div>
                        </div>
                        <div class="settings-members-list d-flex flex-column gap-2">
                            ${members.map(m => {
                                const isThisSuperuser = m.systemRole === 'superuser';
                                return `
                                    <div data-member-id="${m.id}" class="member-inline-row">
                                        <!-- Top row (Avatar, Name, Actions on mobile) -->
                                        <div class="member-row-top">
                                            <div class="member-col-avatar">
                                                <input type="text" class="form-control form-control-sm inline-avatar-input" value="${escapeHTML(m.avatar || '👤')}" title="Emoji-Avatar" />
                                            </div>
                                            <div class="member-col-name">
                                                <input type="text" class="form-control form-control-sm inline-name-input" value="${escapeHTML(m.name || '')}" placeholder="Name eingeben..." />
                                            </div>
                                            <div class="member-col-action">
                                                <button type="button" class="btn btn-sm btn-ghost member-pw-btn" data-id="${m.id}" data-name="${escapeHTML(m.name)}" data-username="${escapeHTML(m.username || '')}" title="Passwort für ${escapeHTML(m.name)} ändern">🔑</button>
                                                ${!isThisSuperuser ? `
                                                    <button type="button" class="btn btn-sm btn-ghost danger-text delete-member-btn" data-id="${m.id}" data-name="${escapeHTML(m.name)}" title="Mitglied löschen">🗑️</button>
                                                ` : `
                                                    <span title="Superuser kann nicht gelöscht werden" style="opacity: 0.35; padding: 4px; font-size: 1rem;">🔒</span>
                                                `}
                                            </div>
                                        </div>

                                        <!-- Middle row (@Username, Color on mobile) -->
                                        <div class="member-row-middle">
                                            <div class="member-col-username">
                                                <div style="display: flex; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 6px; height: 34px;">
                                                    <span style="color: #64748b; font-size: 0.82rem; font-weight: 700; margin-right: 2px;">@</span>
                                                    <input type="text" class="form-control form-control-sm inline-username-input" value="${escapeHTML(m.username || '')}" placeholder="benutzername" style="border: none; background: transparent; padding: 0; font-weight: 700; font-size: 0.84rem; width: 100%; outline: none;" />
                                                </div>
                                            </div>
                                            <div class="member-col-color">
                                                <div class="color-tile-swatch" style="background-color: ${m.color || '#10b981'};" title="Klicken, um Kennfarbe zu ändern">
                                                    <input type="color" class="inline-color-input color-picker-overlay" value="${m.color || '#10b981'}" />
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Bottom row (Role & SystemRole on mobile) -->
                                        <div class="member-row-bottom">
                                            <div class="member-col-role">
                                                <select class="form-select form-select-sm inline-role-select" title="Vereinsposition / Amt">
                                                    ${BOARD_ROLE_OPTIONS.map(r => `
                                                        <option value="${r}" ${m.role && (m.role.startsWith(r) || m.role.includes(r)) ? 'selected' : ''}>${r}</option>
                                                    `).join('')}
                                                    <option value="${escapeHTML(m.role || '')}" ${!BOARD_ROLE_OPTIONS.some(r => m.role && m.role.startsWith(r)) ? 'selected' : ''}>Sonstiges (${escapeHTML(m.role || 'Mitglied')})</option>
                                                </select>
                                            </div>
                                            <div class="member-col-system-role">
                                                ${isThisSuperuser ? `
                                                    <select class="form-select form-select-sm inline-system-role-select" disabled title="Superuser-Status kann unten übertragen werden" style="background: #f5f3ff; color: #6b21a8; font-weight: 800; border-color: #d8b4fe;">
                                                        <option value="superuser" selected>👑 Superuser</option>
                                                    </select>
                                                ` : `
                                                    <select class="form-select form-select-sm inline-system-role-select" title="System-Berechtigung">
                                                        <option value="admin" ${m.systemRole === 'admin' ? 'selected' : ''}>🛡️ Vorstand / Admin (Sieht alles)</option>
                                                        <option value="member" ${m.systemRole === 'member' || !m.systemRole ? 'selected' : ''}>👤 Mitglied (Nur eigene Aufgaben)</option>
                                                    </select>
                                                `}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Superuser Transfer Section (Rendered only for the active Superuser) -->
                    ${isSuper ? `
                        <div class="card-glow p-4 mt-4" style="border-left: 5px solid #8b5cf6; background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 16px;">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span style="font-size: 1.35rem;">👑</span>
                                <h4 class="m-0" style="font-weight: 800; font-size: 1.15rem; color: #581c87;">
                                    Superuser-Hauptverantwortung abgeben & übertragen
                                </h4>
                            </div>
                            <p class="text-muted mb-3" style="font-size: 0.88rem; line-height: 1.5;">
                                Du bist aktuell als <strong>Haupt-Superuser (${escapeHTML(loggedInUser.name)})</strong> eingetragen. 
                                Wenn du aus der Vorstandschaft ausscheidest oder die Systemleitung abgeben möchtest, kannst du die Superuser-Rolle hier an ein anderes Mitglied übertragen. 
                                Dein Account bleibt erhalten und wird automatisch auf <em>Vorstand / Admin</em> umgestellt.
                            </p>
                            <form id="transfer-superuser-form" style="max-width: 680px;" autocomplete="off">
                                <div class="d-flex flex-wrap gap-3 align-items-end">
                                    <div style="flex: 1; min-width: 220px;">
                                        <label style="font-size: 0.8rem; font-weight: 700; color: #581c87; margin-bottom: 0.35rem; display: block;">Nachfolger auswählen</label>
                                        <select id="transfer-target-member-id" class="form-select form-select-sm" required style="border-radius: 10px; height: 40px; font-weight: 600;">
                                            <option value="">-- Mitglied auswählen --</option>
                                            ${members.filter(m => m.id !== loggedInUser.id).map(m => `
                                                <option value="${m.id}">${escapeHTML(m.name)} (${escapeHTML(m.role || 'Vorstand')} • @${escapeHTML(m.username || '')})</option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <div style="flex: 1; min-width: 200px;">
                                        <label style="font-size: 0.8rem; font-weight: 700; color: #581c87; margin-bottom: 0.35rem; display: block;">Dein Passwort zur Bestätigung</label>
                                        <div style="position: relative;">
                                            <input type="password" id="transfer-confirm-password" class="form-control form-control-sm" placeholder="Passwort eingeben..." required style="border-radius: 10px; height: 40px; padding-right: 32px;" />
                                            <button type="button" id="toggle-transfer-pw-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 0.9rem; cursor: pointer; color: #94a3b8;">👁️</button>
                                        </div>
                                    </div>
                                    <div>
                                        <button type="submit" id="transfer-superuser-submit-btn" class="btn btn-sm" style="background: #7c3aed; color: #ffffff; font-weight: 800; padding: 0.6rem 1.35rem; border-radius: 10px; border: none; height: 40px; cursor: pointer; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">
                                            👑 Status übertragen
                                        </button>
                                    </div>
                                </div>
                                <div id="transfer-feedback-msg" style="margin-top: 0.75rem; font-size: 0.85rem; font-weight: 700;"></div>
                            </form>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (subTab === 'my_account') {
            return `
                <div class="d-flex flex-column gap-4" style="max-width: 680px;">
                    <!-- User Info Card -->
                    <div class="card-glow p-4" style="background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle);">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div style="width: 56px; height: 56px; border-radius: 50%; background: ${loggedInUser.color}22; border: 2px solid ${loggedInUser.color}; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
                                ${escapeHTML(loggedInUser.avatar || '👤')}
                            </div>
                            <div>
                                <h3 class="m-0" style="font-weight: 800; font-size: 1.25rem; color: var(--text-primary);">${escapeHTML(loggedInUser.name)}</h3>
                                <div class="d-flex align-items-center gap-2 mt-1">
                                    <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 6px;">@${escapeHTML(loggedInUser.username || '')}</span>
                                    <span class="badge" style="background: ${loggedInUser.color}22; color: ${loggedInUser.color}; font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 6px;">${escapeHTML(loggedInUser.role || 'Vorstandsmitglied')}</span>
                                    <span class="badge" style="background: #ecfdf5; color: #047857; font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 6px;">
                                        ${loggedInUser.systemRole === 'superuser' ? '👑 Superuser' : (loggedInUser.systemRole === 'admin' ? '🛡️ Vorstand / Admin' : '👤 Vorstandsmitglied')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p class="text-muted m-0" style="font-size: 0.88rem; line-height: 1.5;">
                            ${loggedInUser.systemRole === 'member' ? 'Als Vorstandsmitglied hast du Zugriff auf deine eigenen Aufgaben sowie Aufgaben, die dir mit-zugewiesen wurden.' : 'Du besitzt Admin-Zugriff und kannst alle Vorstandsaufgaben einsehen und bearbeiten.'}
                        </p>
                    </div>

                    <!-- Password Change Form -->
                    <div class="card-glow p-4" style="border-left: 5px solid #10b981; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle);">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span style="font-size: 1.35rem;">🔑</span>
                            <h4 class="m-0" style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">
                                Mein Login-Passwort ändern
                            </h4>
                        </div>
                        <p class="text-muted mb-3" style="font-size: 0.88rem; line-height: 1.5;">
                            Ändere dein persönliches Passwort für deinen Account <strong>@${escapeHTML(loggedInUser.username || '')}</strong>.
                        </p>
                        <form id="change-own-password-form" style="max-width: 420px;" autocomplete="off">
                            <div class="mb-3">
                                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Aktuelles Passwort</label>
                                <input type="password" id="own-current-password" class="form-control" placeholder="Bisheriges Passwort..." required style="border-radius: 10px; height: 42px;" />
                            </div>
                            <div class="mb-3">
                                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Neues Passwort (mind. 4 Zeichen)</label>
                                <input type="password" id="own-new-password" class="form-control" placeholder="Neues sicheres Passwort..." required style="border-radius: 10px; height: 42px;" />
                            </div>
                            <div class="mb-3">
                                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Neues Passwort wiederholen</label>
                                <input type="password" id="own-repeat-password" class="form-control" placeholder="Passwort wiederholen..." required style="border-radius: 10px; height: 42px;" />
                            </div>
                            <div id="own-password-feedback" style="display: none; padding: 0.6rem 0.85rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem;"></div>
                            <button type="submit" id="own-password-submit-btn" class="btn btn-donezo-primary w-100" style="height: 42px; font-weight: 800; border-radius: 10px;">
                                💾 Neues Passwort speichern
                            </button>
                        </form>
                    </div>

                    <!-- Personal Profile Customization -->
                    <div class="card-glow p-4" style="background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle);">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span style="font-size: 1.35rem;">🎨</span>
                            <h4 class="m-0" style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">
                                Mein Profil & Farbe anpassen
                            </h4>
                        </div>
                        <form id="change-own-profile-form" style="max-width: 420px;">
                            <div class="mb-3">
                                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Mein Anzeigename</label>
                                <input type="text" id="own-profile-name" class="form-control" value="${escapeHTML(loggedInUser.name)}" required style="border-radius: 10px; height: 42px; font-weight: 700;" />
                            </div>
                            <div class="d-flex gap-3 mb-3">
                                <div style="flex: 1;">
                                    <label style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Mein Emoji-Avatar</label>
                                    <input type="text" id="own-profile-avatar" class="form-control text-center" value="${escapeHTML(loggedInUser.avatar || '👤')}" maxlength="4" style="border-radius: 10px; height: 42px; font-size: 1.4rem;" />
                                </div>
                                <div style="flex: 1;">
                                    <label style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Meine Kennfarbe</label>
                                    <div class="d-flex align-items-center gap-2">
                                        <input type="color" id="own-profile-color" value="${loggedInUser.color || '#10b981'}" style="width: 44px; height: 42px; border-radius: 10px; border: 1px solid #cbd5e1; cursor: pointer; padding: 0;" />
                                        <span id="own-color-preview-text" style="font-family: monospace; font-size: 0.85rem; font-weight: 700; color: #64748b;">${loggedInUser.color || '#10b981'}</span>
                                    </div>
                                </div>
                            </div>
                            <div id="own-profile-feedback" style="display: none; padding: 0.6rem 0.85rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem;"></div>
                            <button type="submit" id="own-profile-submit-btn" class="btn btn-secondary w-100" style="height: 42px; font-weight: 800; border-radius: 10px; background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1;">
                                💾 Profil aktualisieren
                            </button>
                        </form>
                    </div>
                </div>
            `;
        } else if (subTab === 'categories') {
            return `
                <div class="card-glow p-4">
                    <div class="toolbar-row d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <div>
                            <h3 class="m-0 font-size-md" style="font-weight: 800; font-size: 1.15rem;">🏷️ Aufgaben-Kategorien verwalten (${categories.length})</h3>
                            <p class="text-muted m-0 mt-0.5" style="font-size: 0.82rem;">Kategorien ordnen Aufgaben im Aufgabenplan und auf dem Dashboard.</p>
                        </div>
                        <button class="btn btn-donezo-primary btn-sm" id="add-category-btn">➕ Neue Kategorie</button>
                    </div>

                    <div class="settings-categories-container">
                        <div class="settings-categories-header">
                            <div class="sc-col-icon text-center">Icon</div>
                            <div class="sc-col-name">Kategorie-Name</div>
                            <div class="sc-col-action text-center">Aktion</div>
                        </div>
                        <div class="settings-categories-list d-flex flex-column gap-2">
                            ${categories.map(c => `
                                <div data-cat-id="${c.id}" class="category-inline-row">
                                    <div class="cat-col-icon">
                                        <input type="text" class="form-control form-control-sm cat-icon-input" value="${escapeHTML(c.icon || '📁')}" style="text-align: center; font-size: 1.15rem; width: 44px; margin: 0 auto;" />
                                    </div>
                                    <div class="cat-col-name">
                                        <input type="text" class="form-control form-control-sm cat-name-input" value="${escapeHTML(c.name || '')}" placeholder="Kategorie Name..." />
                                    </div>
                                    <div class="cat-col-action text-center">
                                        <button class="btn btn-sm btn-ghost danger-text delete-cat-btn" data-id="${c.id}" title="Kategorie löschen">🗑️</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        } else if (subTab === 'security' && isAdmin) {
            return `
                <div class="d-flex flex-column gap-4" style="max-width: 680px;">
                    <!-- Master-Passwort / PIN für den geschützten Bereich (Kasse, Verträge, Protokolle) -->
                    <div class="card-glow p-4" style="border-left: 5px solid #f59e0b; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-donezo);">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span style="font-size: 1.35rem;">🛡️</span>
                            <h3 class="m-0" style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">
                                Tresor-PIN (Geschützter Bereich: Kasse & Protokolle)
                            </h3>
                        </div>
                        <p class="text-muted mb-3" style="line-height: 1.5; font-size: 0.88rem;">
                            Dieser PIN schützt die vertraulichen Vereinsbereiche (Kassenbuch, Finanzen, Verträge und Sitzungsprotokolle). 
                            Sobald du einen neuen PIN festlegst, wird dieser sofort verschlüsselt in der Cloud gespeichert und ist geräteübergreifend aktiv.
                        </p>

                        <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                            <div class="settings-code-input-wrapper" style="position: relative; width: 270px;">
                                <input type="password" id="backend-pin-input" class="form-control form-control-sm" maxlength="12" placeholder="Neuer Tresor-PIN..." style="font-weight: bold; font-size: 0.95rem; padding-right: 32px;" />
                                <button type="button" id="toggle-settings-vault-pin-btn" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 0.95rem; cursor: pointer; color: var(--text-muted);" title="PIN anzeigen">👁️</button>
                            </div>
                            <button class="btn btn-sm font-bold" id="save-pin-backend-btn" style="padding: 0.45rem 1.15rem; border-radius: 10px; background: #f59e0b; color: #ffffff; border: none; cursor: pointer;">
                                💾 Tresor-PIN speichern
                            </button>
                        </div>
                        <div id="pin-feedback-msg" style="font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;"></div>
                    </div>

                    <!-- Information & Standards -->
                    <div class="card-glow p-4" style="border-left: 5px solid #0284c7; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px;">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span style="font-size: 1.35rem;">ℹ️</span>
                            <h4 class="m-0" style="font-weight: 800; font-size: 1.1rem; color: #0369a1;">
                                Standard-Zugangsdaten & Notfall-Wiederherstellung
                            </h4>
                        </div>
                        <div style="font-size: 0.88rem; line-height: 1.6; color: #0c4a6e;">
                            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0;">
                                <li><strong>Initial-Passwort für neue Mitglieder:</strong> <code>Scheuring2026!</code> (kann nach Login direkt geändert werden)</li>
                                <li><strong>Notfall Master-Code:</strong> <code>2026</code> (funktioniert stets als Master-Wiederherstellungsschlüssel für Administratoren)</li>
                                <li><strong>Sicherheit:</strong> Alle Passwörter und PINs werden mit SHA-256 kryptografisch gehasht und clientseitig gesalzen. Es werden keine Passwörter im Klartext gespeichert.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        return '';
    }

    static bindEvents(containerEl, members, categories, onMembersUpdatedCallback) {
        const loggedInUser = StorageEngine.getLoggedInUser();
        const isAdmin = StorageEngine.isAdminOrSuperUser();
        const isSuper = StorageEngine.isSuperUser();

        // 1. Sub-Tabs Navigation
        containerEl.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                activeSubTab = e.currentTarget.dataset.subtab;
                this.render(containerEl, onMembersUpdatedCallback);
            });
        });

        // 2. Members Auto-Save (only for Admin/Superuser)
        if (activeSubTab === 'members' && isAdmin) {
            const saveMembersState = () => {
                const rows = containerEl.querySelectorAll('.member-inline-row');
                if (rows.length === 0) return;
                const currentList = StorageEngine.getMembers();
                const updatedMembers = [];

                rows.forEach(row => {
                    const id = row.dataset.memberId;
                    const existing = currentList.find(m => m.id === id) || {};
                    const avatar = row.querySelector('.inline-avatar-input')?.value.trim() || existing.avatar || '👤';
                    const name = row.querySelector('.inline-name-input')?.value.trim() || existing.name || 'Unbenannt';
                    const rawUser = row.querySelector('.inline-username-input')?.value.trim() || existing.username || '';
                    const username = rawUser.toLowerCase().replace(/[^a-z0-9._-]/g, '') || ('user_' + id);
                    const role = row.querySelector('.inline-role-select')?.value || existing.role || 'Beisitzer';

                    let systemRole = existing.systemRole || 'member';
                    const systemRoleSelect = row.querySelector('.inline-system-role-select');
                    if (systemRoleSelect && !systemRoleSelect.disabled) {
                        systemRole = systemRoleSelect.value;
                    }

                    const color = row.querySelector('.inline-color-input')?.value || existing.color || '#10b981';

                    updatedMembers.push({
                        ...existing,
                        id,
                        name,
                        username,
                        role,
                        systemRole,
                        avatar,
                        color,
                        bgLight: color + '22',
                        passwordHash: existing.passwordHash || '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c'
                    });
                });

                StorageEngine.saveMembers(updatedMembers);
                if (onMembersUpdatedCallback) onMembersUpdatedCallback();
            };

            containerEl.querySelectorAll('.member-inline-row input, .member-inline-row select').forEach(input => {
                input.addEventListener('change', saveMembersState);
            });

            // Live preview for member color swatches
            containerEl.querySelectorAll('.inline-color-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const swatch = e.target.closest('.color-tile-swatch');
                    if (swatch) {
                        swatch.style.backgroundColor = e.target.value;
                    }
                    saveMembersState();
                });
            });

            // Add Member Modal Trigger
            document.getElementById('add-member-modal-trigger-btn')?.addEventListener('click', () => {
                this.openAddMemberModal(containerEl, onMembersUpdatedCallback);
            });

            // Set Member Password Button
            containerEl.querySelectorAll('.member-pw-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mId = e.currentTarget.dataset.id;
                    const mName = e.currentTarget.dataset.name;
                    const mUser = e.currentTarget.dataset.username;
                    this.openSetMemberPasswordModal(mId, mName, mUser);
                });
            });

            // Delete Member
            containerEl.querySelectorAll('.delete-member-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const memberId = e.currentTarget.dataset.id;
                    const memberName = e.currentTarget.dataset.name || 'dieses Mitglied';
                    if (confirm(`Möchtest du "${memberName}" wirklich aus der Vorstandschaft entfernen?`)) {
                        const currentList = StorageEngine.getMembers();
                        const target = currentList.find(m => m.id === memberId);
                        if (target && target.systemRole === 'superuser') {
                            alert('Der Superuser kann nicht gelöscht werden! Übertrage zuerst den Status auf ein anderes Mitglied.');
                            return;
                        }
                        const updated = currentList.filter(m => m.id !== memberId);
                        StorageEngine.saveMembers(updated);
                        if (onMembersUpdatedCallback) onMembersUpdatedCallback();
                        this.render(containerEl, onMembersUpdatedCallback);
                    }
                });
            });

            // Superuser Transfer Form Handler
            const transferForm = document.getElementById('transfer-superuser-form');
            if (transferForm) {
                const toggleBtn = document.getElementById('toggle-transfer-pw-btn');
                const pwInput = document.getElementById('transfer-confirm-password');
                toggleBtn?.addEventListener('click', () => {
                    if (pwInput.type === 'password') {
                        pwInput.type = 'text';
                        toggleBtn.textContent = '🙈';
                    } else {
                        pwInput.type = 'password';
                        toggleBtn.textContent = '👁️';
                    }
                });

                transferForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const targetSelect = document.getElementById('transfer-target-member-id');
                    const targetMemberId = targetSelect?.value;
                    const password = (pwInput?.value || '').trim();
                    const feedbackEl = document.getElementById('transfer-feedback-msg');
                    const submitBtn = document.getElementById('transfer-superuser-submit-btn');

                    if (!targetMemberId) {
                        if (feedbackEl) {
                            feedbackEl.innerHTML = '<span style="color: #dc2626;">⚠️ Bitte wähle ein Mitglied als Nachfolger aus.</span>';
                        }
                        return;
                    }

                    if (!password) {
                        if (feedbackEl) {
                            feedbackEl.innerHTML = '<span style="color: #dc2626;">⚠️ Bitte gib dein aktuelles Passwort zur Bestätigung ein.</span>';
                        }
                        return;
                    }

                    submitBtn.disabled = true;
                    submitBtn.textContent = '⏳ Übertrage Status...';

                    const res = await StorageEngine.transferSuperUser(targetMemberId, password);

                    if (res.success) {
                        feedbackEl.innerHTML = `<span style="color: #059669;">✅ ${escapeHTML(res.message)}</span>`;
                        setTimeout(() => {
                            if (onMembersUpdatedCallback) onMembersUpdatedCallback();
                            this.render(containerEl, onMembersUpdatedCallback);
                        }, 1200);
                    } else {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '👑 Status übertragen';
                        feedbackEl.innerHTML = `<span style="color: #dc2626;">⚠️ ${escapeHTML(res.error || 'Fehler beim Übertragen.')}</span>`;
                    }
                });
            }
        }

        // 3. My Account Actions (Own Password & Profile)
        if (activeSubTab === 'my_account') {
            // Change Own Password
            const ownPwForm = document.getElementById('change-own-password-form');
            ownPwForm?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const curPass = (document.getElementById('own-current-password')?.value || '').trim();
                const newPass = (document.getElementById('own-new-password')?.value || '').trim();
                const repPass = (document.getElementById('own-repeat-password')?.value || '').trim();
                const feedbackEl = document.getElementById('own-password-feedback');
                const submitBtn = document.getElementById('own-password-submit-btn');

                feedbackEl.style.display = 'none';

                if (newPass.length < 4) {
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = '#fef2f2';
                    feedbackEl.style.color = '#dc2626';
                    feedbackEl.textContent = '⚠️ Das neue Passwort muss mindestens 4 Zeichen lang sein.';
                    return;
                }

                if (newPass !== repPass) {
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = '#fef2f2';
                    feedbackEl.style.color = '#dc2626';
                    feedbackEl.textContent = '⚠️ Die neuen Passwörter stimmen nicht überein.';
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Prüfe Passwort...';

                // Verify current password
                let isCurrentValid = curPass === '2026';
                if (!isCurrentValid) {
                    const check = await StorageEngine.verifyUserLogin(loggedInUser.username, curPass);
                    isCurrentValid = check.success;
                }

                if (!isCurrentValid) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 Neues Passwort speichern';
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = '#fef2f2';
                    feedbackEl.style.color = '#dc2626';
                    feedbackEl.textContent = '⚠️ Dein aktuelles Passwort ist nicht korrekt.';
                    return;
                }

                // Update password
                await StorageEngine.updateMemberCredentials(loggedInUser.id, { newPassword: newPass });

                submitBtn.disabled = false;
                submitBtn.textContent = '💾 Neues Passwort speichern';
                feedbackEl.style.display = 'block';
                feedbackEl.style.background = '#ecfdf5';
                feedbackEl.style.color = '#059669';
                feedbackEl.textContent = '✅ Dein persönliches Passwort wurde erfolgreich geändert!';

                document.getElementById('own-current-password').value = '';
                document.getElementById('own-new-password').value = '';
                document.getElementById('own-repeat-password').value = '';
            });

            // Change Own Profile
            const ownProfileForm = document.getElementById('change-own-profile-form');
            const colorInput = document.getElementById('own-profile-color');
            const colorText = document.getElementById('own-color-preview-text');

            colorInput?.addEventListener('input', (e) => {
                if (colorText) colorText.textContent = e.target.value;
            });

            ownProfileForm?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = (document.getElementById('own-profile-name')?.value || '').trim();
                const avatar = (document.getElementById('own-profile-avatar')?.value || '').trim() || '👤';
                const color = colorInput?.value || '#10b981';
                const feedbackEl = document.getElementById('own-profile-feedback');

                if (!name) return;

                await StorageEngine.updateMemberCredentials(loggedInUser.id, { name, avatar, color });

                if (feedbackEl) {
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = '#ecfdf5';
                    feedbackEl.style.color = '#059669';
                    feedbackEl.textContent = '✅ Profil erfolgreich aktualisiert!';
                }

                if (onMembersUpdatedCallback) onMembersUpdatedCallback();
                setTimeout(() => {
                    this.render(containerEl, onMembersUpdatedCallback);
                }, 1000);
            });
        }

        // 4. Categories Auto-Save & Actions
        if (activeSubTab === 'categories') {
            const saveCategoriesState = () => {
                const rows = containerEl.querySelectorAll('.category-inline-row');
                if (rows.length === 0) return;
                const updatedCats = [];
                rows.forEach(row => {
                    const id = row.dataset.catId;
                    const icon = row.querySelector('.cat-icon-input').value.trim() || '📁';
                    const name = row.querySelector('.cat-name-input').value.trim() || 'Kategorie';
                    const existing = categories.find(c => c.id === id);
                    const color = existing?.color || '#10b981';
                    updatedCats.push({ id, name, icon, color });
                });
                StorageEngine.saveCategories(updatedCats);
            };

            containerEl.querySelectorAll('.category-inline-row input').forEach(input => {
                input.addEventListener('change', saveCategoriesState);
            });

            // Add Category
            document.getElementById('add-category-btn')?.addEventListener('click', () => {
                const currentCats = StorageEngine.getCategories();
                currentCats.unshift({
                    id: 'cat_' + Date.now(),
                    name: 'Neue Kategorie',
                    icon: '📁',
                    color: '#10b981'
                });
                StorageEngine.saveCategories(currentCats);
                this.render(containerEl, onMembersUpdatedCallback);
            });

            // Delete Category
            containerEl.querySelectorAll('.delete-cat-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const catId = e.currentTarget.dataset.id;
                    if (confirm('Kategorie wirklich löschen?')) {
                        const updated = StorageEngine.getCategories().filter(c => c.id !== catId);
                        StorageEngine.saveCategories(updated);
                        this.render(containerEl, onMembersUpdatedCallback);
                    }
                });
            });
        }

        // 5. Security Actions (PIN Backend Update)
        if (activeSubTab === 'security' && isAdmin) {
            const pinToggleBtn = document.getElementById('toggle-settings-vault-pin-btn');
            const pinInput = document.getElementById('backend-pin-input');
            pinToggleBtn?.addEventListener('click', () => {
                if (pinInput.type === 'password') {
                    pinInput.type = 'text';
                    pinToggleBtn.textContent = '🙈';
                } else {
                    pinInput.type = 'password';
                    pinToggleBtn.textContent = '👁️';
                }
            });

            document.getElementById('save-pin-backend-btn')?.addEventListener('click', async () => {
                const feedbackMsg = document.getElementById('pin-feedback-msg');
                const newPin = (pinInput?.value || '').trim();

                if (newPin.length >= 4) {
                    if (feedbackMsg) feedbackMsg.innerHTML = '⏳ <i>Speichere neuen Tresor-PIN...</i>';
                    await StorageEngine.setPIN(newPin);

                    try {
                        const token = sessionStorage.getItem('backend_vault_token') || '';
                        await fetch('/api/update-pin', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Public-Key': 'lj_pub_2026_scheuring',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ newPin })
                        });
                    } catch (e) {
                        console.log('Backend sync offline, local PIN updated.');
                    }

                    if (feedbackMsg) {
                        feedbackMsg.innerHTML = '<span style="color: #10b981;">✅ Neuer Tresor-PIN aktiv! Auf allen Geräten synchronisiert.</span>';
                    }
                    if (pinInput) pinInput.value = '';
                    setTimeout(() => {
                        if (feedbackMsg) feedbackMsg.innerHTML = '';
                    }, 4000);
                } else {
                    if (feedbackMsg) {
                        feedbackMsg.innerHTML = '<span style="color: #ef4444;">⚠️ Bitte mindestens 4 Ziffern/Zeichen als PIN eingeben.</span>';
                    }
                }
            });
        }
    }

    /**
     * Modal to create a new board member
     */
    static openAddMemberModal(containerEl, onMembersUpdatedCallback) {
        document.getElementById('add-member-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'add-member-modal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 1000000;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
            animation: fadeIn 0.2s ease-out;
            font-family: 'Plus Jakarta Sans', sans-serif;
            box-sizing: border-box;
        `;

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 24px; max-width: 520px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.35); overflow: hidden; border: 1px solid rgba(255,255,255,0.3); animation: fadeInScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, var(--donezo-forest) 0%, #064e3b 100%); color: #ffffff; padding: 1.35rem 1.6rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.6rem;">➕</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.01em;">Neues Vorstandsmitglied anlegen</h3>
                            <span style="font-size: 0.78rem; opacity: 0.9;">Neuer Account & Zugangsdaten</span>
                        </div>
                    </div>
                    <button type="button" id="close-add-member-modal-btn" style="background: rgba(255,255,255,0.2); border: none; color: #ffffff; font-size: 1.2rem; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>

                <!-- Form -->
                <form id="add-member-dialog-form" style="padding: 1.6rem;" autocomplete="off">
                    <div class="mb-3">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Vollständiger Name *</label>
                        <input type="text" id="new-member-name" class="form-control" placeholder="z.B. Max Mustermann" required style="border-radius: 10px; height: 42px; font-weight: 700;" />
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-8">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Benutzername (Login) *</label>
                            <div style="display: flex; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 10px; height: 42px;">
                                <span style="color: #64748b; font-weight: 700; margin-right: 4px;">@</span>
                                <input type="text" id="new-member-username" placeholder="max" required style="border: none; background: transparent; font-weight: 700; width: 100%; outline: none;" />
                            </div>
                        </div>
                        <div class="col-4">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Avatar Emoji</label>
                            <input type="text" id="new-member-avatar" class="form-control text-center" value="👤" maxlength="4" style="border-radius: 10px; height: 42px; font-size: 1.3rem;" />
                        </div>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-7">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Vorstandsposition / Amt *</label>
                            <select id="new-member-role" class="form-select" style="border-radius: 10px; height: 42px; font-weight: 600;">
                                ${BOARD_ROLE_OPTIONS.map(r => `<option value="${r}">${r}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-5">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Kennfarbe</label>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input type="color" id="new-member-color" value="#10b981" style="width: 44px; height: 42px; border-radius: 10px; border: 1px solid #cbd5e1; cursor: pointer; padding: 0;" />
                                <span id="new-member-color-code" style="font-family: monospace; font-size: 0.8rem; font-weight: 700; color: #64748b;">#10b981</span>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">System-Berechtigung *</label>
                        <select id="new-member-system-role" class="form-select" style="border-radius: 10px; height: 42px; font-weight: 600;">
                            <option value="member" selected>👤 Vorstandsmitglied (Sieht nur eigene Aufgaben)</option>
                            <option value="admin">🛡️ Vorstand / Admin (Sieht alle Aufgaben im Verein)</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Initiales Passwort</label>
                        <input type="text" id="new-member-password" class="form-control" value="Scheuring2026!" style="border-radius: 10px; height: 42px; font-weight: 600;" />
                        <span style="font-size: 0.75rem; color: #64748b; margin-top: 4px; display: block;">Standard ist <code>Scheuring2026!</code>. Kann vom Mitglied jederzeit geändert werden.</span>
                    </div>

                    <div id="add-member-error" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.6rem 0.85rem; border-radius: 10px; font-size: 0.82rem; font-weight: 700; margin-bottom: 1rem;"></div>

                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" id="cancel-add-member-btn" class="btn btn-ghost" style="padding: 0.6rem 1.25rem; font-weight: 700;">Abbrechen</button>
                        <button type="submit" id="submit-add-member-btn" class="btn btn-donezo-primary" style="padding: 0.6rem 1.5rem; font-weight: 800; border-radius: 12px;">💾 Mitglied speichern</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-generate username from name
        const nameInput = modal.querySelector('#new-member-name');
        const userInput = modal.querySelector('#new-member-username');
        const colorInput = modal.querySelector('#new-member-color');
        const colorCode = modal.querySelector('#new-member-color-code');

        nameInput?.addEventListener('input', () => {
            if (!userInput.dataset.manuallyEdited) {
                const parts = nameInput.value.trim().toLowerCase().split(' ');
                userInput.value = parts[0].replace(/[^a-z0-9]/g, '');
            }
        });
        userInput?.addEventListener('input', () => {
            userInput.dataset.manuallyEdited = 'true';
        });
        colorInput?.addEventListener('input', (e) => {
            colorCode.textContent = e.target.value;
        });

        // Close handlers
        const closeModal = () => modal.remove();
        modal.querySelector('#close-add-member-modal-btn')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-add-member-btn')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Submit handler
        const form = modal.querySelector('#add-member-dialog-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = (nameInput?.value || '').trim();
            const rawUser = (userInput?.value || '').trim();
            const username = rawUser.toLowerCase().replace(/[^a-z0-9._-]/g, '');
            const avatar = (modal.querySelector('#new-member-avatar')?.value || '').trim() || '👤';
            const role = modal.querySelector('#new-member-role')?.value || 'Beisitzer';
            const systemRole = modal.querySelector('#new-member-system-role')?.value || 'member';
            const color = colorInput?.value || '#10b981';
            const initialPass = (modal.querySelector('#new-member-password')?.value || '').trim() || 'Scheuring2026!';
            const errorEl = modal.querySelector('#add-member-error');

            if (!name || !username) {
                errorEl.textContent = '⚠️ Bitte Name und Benutzername ausfüllen.';
                errorEl.style.display = 'block';
                return;
            }

            const currentMembers = StorageEngine.getMembers();
            if (currentMembers.some(m => (m.username || '').toLowerCase() === username)) {
                errorEl.textContent = `⚠️ Der Benutzername "@${username}" ist bereits vergeben.`;
                errorEl.style.display = 'block';
                return;
            }

            const passHash = await StorageEngine.hashPassword(initialPass);
            const newMember = {
                id: 'm_' + Date.now(),
                name,
                username,
                role,
                systemRole,
                avatar,
                color,
                bgLight: color + '22',
                passwordHash: passHash
            };

            currentMembers.push(newMember);
            StorageEngine.saveMembers(currentMembers);

            closeModal();
            if (onMembersUpdatedCallback) onMembersUpdatedCallback();
            SettingsModule.render(containerEl, onMembersUpdatedCallback);
        });
    }

    /**
     * Modal to set password for any member (Admin Tool)
     */
    static openSetMemberPasswordModal(memberId, memberName, memberUsername) {
        document.getElementById('set-member-pw-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'set-member-pw-modal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 1000000;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
            animation: fadeIn 0.2s ease-out;
            font-family: 'Plus Jakarta Sans', sans-serif;
            box-sizing: border-box;
        `;

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 24px; max-width: 460px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.35); overflow: hidden; border: 1px solid rgba(255,255,255,0.3); animation: fadeInScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 1.35rem 1.6rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.6rem;">🔑</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800;">Passwort festlegen</h3>
                            <span style="font-size: 0.78rem; opacity: 0.9;">${escapeHTML(memberName)} (@${escapeHTML(memberUsername)})</span>
                        </div>
                    </div>
                    <button type="button" id="close-set-pw-modal-btn" style="background: rgba(255,255,255,0.2); border: none; color: #ffffff; font-size: 1.2rem; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>

                <form id="set-member-pw-form" style="padding: 1.6rem;" autocomplete="off">
                    <p style="color: #475569; font-size: 0.86rem; line-height: 1.5; margin: 0 0 1.25rem;">
                        Vergib ein neues Passwort für <strong>${escapeHTML(memberName)}</strong>. Das Mitglied kann sich anschließend sofort mit diesem Passwort anmelden.
                    </p>

                    <div class="mb-3">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Neues Passwort (mind. 4 Zeichen) *</label>
                        <div style="position: relative;">
                            <input type="password" id="modal-member-new-pw" class="form-control" placeholder="Neues Passwort..." required style="border-radius: 10px; height: 42px; padding-right: 36px;" />
                            <button type="button" id="toggle-modal-member-pw" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 0.95rem; cursor: pointer; color: #94a3b8;">👁️</button>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block;">Passwort wiederholen *</label>
                        <input type="password" id="modal-member-rep-pw" class="form-control" placeholder="Passwort wiederholen..." required style="border-radius: 10px; height: 42px;" />
                    </div>

                    <div id="set-pw-error" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.6rem 0.85rem; border-radius: 10px; font-size: 0.82rem; font-weight: 700; margin-bottom: 1rem;"></div>

                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" id="cancel-set-pw-btn" class="btn btn-ghost" style="padding: 0.6rem 1.25rem; font-weight: 700;">Abbrechen</button>
                        <button type="submit" id="submit-set-pw-btn" class="btn btn-donezo-primary" style="padding: 0.6rem 1.5rem; font-weight: 800; border-radius: 12px;">💾 Passwort speichern</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const newPwInput = modal.querySelector('#modal-member-new-pw');
        const repPwInput = modal.querySelector('#modal-member-rep-pw');
        const toggleBtn = modal.querySelector('#toggle-modal-member-pw');
        const errorEl = modal.querySelector('#set-pw-error');

        toggleBtn?.addEventListener('click', () => {
            if (newPwInput.type === 'password') {
                newPwInput.type = 'text';
                toggleBtn.textContent = '🙈';
            } else {
                newPwInput.type = 'password';
                toggleBtn.textContent = '👁️';
            }
        });

        const closeModal = () => modal.remove();
        modal.querySelector('#close-set-pw-modal-btn')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-set-pw-btn')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('#set-member-pw-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = (newPwInput?.value || '').trim();
            const repPass = (repPwInput?.value || '').trim();

            if (newPass.length < 4) {
                errorEl.textContent = '⚠️ Das Passwort muss mindestens 4 Zeichen lang sein.';
                errorEl.style.display = 'block';
                return;
            }

            if (newPass !== repPass) {
                errorEl.textContent = '⚠️ Die Passwörter stimmen nicht überein.';
                errorEl.style.display = 'block';
                return;
            }

            const submitBtn = modal.querySelector('#submit-set-pw-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Speichere...';

            await StorageEngine.updateMemberCredentials(memberId, { newPassword: newPass });

            submitBtn.textContent = '✅ Gespeichert!';
            setTimeout(() => {
                closeModal();
            }, 600);
        });
    }
}
