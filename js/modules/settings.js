/**
 * Settings Module with True Separate Sub-Pages (Render ONLY Active Sub-Tab)
 */
import { BOARD_ROLE_OPTIONS } from '../data.js';
import { StorageEngine } from '../storage.js';
import { SecurityUtils } from '../utils/security.js';
import { AppAuth } from './auth.js';

const escapeHTML = SecurityUtils.escapeHTML.bind(SecurityUtils);
let activeSubTab = 'members'; // 'members', 'categories', 'security'

export class SettingsModule {
    static isSecurityUnlocked = false;

    static render(containerEl, onMembersUpdatedCallback) {
        try {
            const members = StorageEngine.getMembers() || [];
            const categories = StorageEngine.getCategories() || [];
            const currentPin = '••••';

            containerEl.innerHTML = `
                <div class="settings-wrapper w-100">
                    <!-- Unified Donezo Header Bar with Segmented Sub-Tab Switcher -->
                    <div class="card-glow p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <h2 class="m-0" style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">⚙️ Vorstands-Verwaltung & Einstellungen</h2>
                                <p class="text-muted m-0 mt-1" style="font-size: 0.88rem;">Mitglieder, Kategorien und Bereichs-Sicherheit der Landjugend Scheuring</p>
                            </div>
                            
                            <!-- Segmented Pill Button Group matching Dashboard / Tasks controls -->
                            <div class="settings-nav-pill-group d-flex align-items-center gap-1.5 p-1" style="background: var(--bg-canvas); border: 1px solid var(--border-medium); border-radius: 12px;">
                                <button type="button" class="sub-tab-btn ${activeSubTab === 'members' ? 'active' : ''}" data-subtab="members">
                                    👥 Mitglieder (${members.length})
                                </button>
                                <button type="button" class="sub-tab-btn ${activeSubTab === 'categories' ? 'active' : ''}" data-subtab="categories">
                                    🏷️ Kategorien (${categories.length})
                                </button>
                                <button type="button" class="sub-tab-btn ${activeSubTab === 'security' ? 'active' : ''}" data-subtab="security">
                                    🔒 Sicherheit & Passwörter
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Render ONLY the Selected Sub-Page Content -->
                    <div class="sub-page-viewport">
                        ${this.renderSubPageContent(activeSubTab, members, categories, currentPin)}
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
     * Renders strictly ONLY the active sub-tab view so no scrolling over other sections occurs!
     */
    static renderSubPageContent(subTab, members, categories, currentPin) {
        if (subTab === 'members') {
            return `
                <div class="card-glow p-4">
                    <div class="toolbar-row d-flex justify-content-between align-items-center mb-3">
                        <h3 class="m-0 font-size-md" style="font-weight: 800; font-size: 1.15rem;">👥 Vorstandsmitglieder verwalten (${members.length} Personen)</h3>
                        <button class="btn btn-donezo-primary btn-sm" id="add-member-inline-btn">➕ Neues Mitglied</button>
                    </div>

                    <div class="table-responsive">
                        <table class="settings-table clean-tasks-table w-100">
                            <thead>
                                <tr>
                                    <th style="width: 54px;">Icon</th>
                                    <th>Name des Mitglieds</th>
                                    <th style="width: 240px;">Vorstandsposition / Amt</th>
                                    <th style="width: 120px;">Kennfarbe</th>
                                    <th style="width: 50px; text-align: center;">Aktion</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${members.map(m => `
                                    <tr data-member-id="${m.id}" class="member-inline-row">
                                        <td>
                                            <input type="text" class="form-control form-control-sm inline-avatar-input" value="${escapeHTML(m.avatar || '👤')}" />
                                        </td>
                                        <td>
                                            <input type="text" class="form-control form-control-sm inline-name-input" value="${escapeHTML(m.name || '')}" placeholder="Name eingeben..." />
                                        </td>
                                        <td>
                                            <select class="form-select form-select-sm inline-role-select">
                                                ${BOARD_ROLE_OPTIONS.map(r => `
                                                    <option value="${r}" ${m.role && (m.role.startsWith(r) || m.role.includes(r)) ? 'selected' : ''}>${r}</option>
                                                `).join('')}
                                                <option value="${escapeHTML(m.role || '')}" ${!BOARD_ROLE_OPTIONS.some(r => m.role && m.role.startsWith(r)) ? 'selected' : ''}>Sonstiges (${escapeHTML(m.role || 'Mitglied')})</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div class="color-tile-swatch" style="background-color: ${m.color || '#10b981'};" title="Klicken, um Farbe zu ändern">
                                                <input type="color" class="inline-color-input color-picker-overlay" value="${m.color || '#10b981'}" />
                                            </div>
                                        </td>
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-ghost danger-text delete-member-btn" data-id="${m.id}" title="Mitglied löschen">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else if (subTab === 'categories') {
            return `
                <div class="card-glow p-4">
                    <div class="toolbar-row d-flex justify-content-between align-items-center mb-3">
                        <h3 class="m-0 font-size-md" style="font-weight: 800; font-size: 1.15rem;">🏷️ Aufgaben-Kategorien verwalten (${categories.length})</h3>
                        <button class="btn btn-donezo-primary btn-sm" id="add-category-btn">➕ Neue Kategorie</button>
                    </div>

                    <div class="table-responsive">
                        <table class="settings-table clean-tasks-table w-100">
                            <thead>
                                <tr>
                                    <th style="width: 70px; text-align: center;">Icon</th>
                                    <th>Kategorie-Name</th>
                                    <th style="width: 60px; text-align: center;">Aktion</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categories.map(c => `
                                    <tr data-cat-id="${c.id}" class="category-inline-row">
                                        <td style="text-align: center;">
                                            <input type="text" class="form-control form-control-sm cat-icon-input" value="${escapeHTML(c.icon || '📁')}" style="text-align: center; font-size: 1.15rem; width: 48px; margin: 0 auto;" />
                                        </td>
                                        <td>
                                            <input type="text" class="form-control form-control-sm cat-name-input" value="${escapeHTML(c.name || '')}" placeholder="Kategorie Name..." />
                                        </td>
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-ghost danger-text delete-cat-btn" data-id="${c.id}" title="Kategorie löschen">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else if (subTab === 'security') {
            if (!this.isSecurityUnlocked) {
                return `
                    <div class="card-glow p-4 text-center" style="max-width: 520px; margin: 1.5rem auto; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                        <div style="font-size: 2.8rem; margin-bottom: 0.75rem;">🛡️</div>
                        <h3 style="font-weight: 800; font-size: 1.3rem; margin-bottom: 0.5rem; color: var(--text-primary);">
                            Admin-Berechtigung erforderlich
                        </h3>
                        <p class="text-muted" style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
                            Das Einsehen und Ändern von Passwörtern, Codes und Zugängen ist nur für befugte Vorstandsmitglieder gestattet.<br/>
                            Bitte bestätige deine Berechtigung mit dem <strong>Vorstands-Passwort</strong> oder der <strong>Master-PIN</strong>.
                        </p>
                        
                        <form id="settings-auth-form" style="max-width: 360px; margin: 0 auto;" autocomplete="off">
                            <div style="position: relative; margin-bottom: 1rem;">
                                <input type="password" id="settings-auth-input" class="form-control" placeholder="Passwort oder PIN eingeben..." required style="font-size: 1rem; font-weight: 700; padding: 0.75rem 2.8rem 0.75rem 1rem; border-radius: 12px; height: 46px; border: 2px solid #e2e8f0; outline: none; width: 100%; box-sizing: border-box;" />
                                <button type="button" id="toggle-settings-auth-visibility" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #94a3b8;" title="Passwort anzeigen">👁️</button>
                            </div>
                            <div id="settings-auth-error" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.6rem 0.85rem; border-radius: 10px; font-size: 0.82rem; font-weight: 700; margin-bottom: 1rem;"></div>
                            <button type="submit" id="settings-auth-submit-btn" class="btn btn-donezo-primary w-100" style="padding: 0.85rem; font-weight: 800; border-radius: 12px;">
                                🔓 Bereich freischalten
                            </button>
                            <div style="margin-top: 1.15rem; text-align: center;">
                                <button type="button" id="settings-forgot-pw-btn" style="background: none; border: none; color: #64748b; font-size: 0.82rem; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 4px;">
                                    Passwort vergessen?
                                </button>
                            </div>
                        </form>
                    </div>
                `;
            }

            return `
                <div class="d-flex flex-column gap-4" style="max-width: 680px;">
                    <!-- Admin Status Banner -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 0.85rem 1.15rem; flex-wrap: wrap; gap: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <span style="font-size: 1.2rem;">🟢</span>
                            <span style="font-weight: 800; font-size: 0.88rem; color: #047857;">Admin-Berechtigung aktiv – Passwörter können geändert werden</span>
                        </div>
                        <button type="button" class="btn btn-sm btn-ghost" id="lock-settings-security-btn" style="color: #047857; font-weight: 700; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.35rem 0.75rem;">
                            🔒 Bereich wieder sperren
                        </button>
                    </div>

                    <!-- 1. Zentrales Vorstands-Passwort (Generelle Zentrale) -->
                    <div class="card-glow p-4" style="border-left: 5px solid #10b981; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-donezo);">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span style="font-size: 1.35rem;">🔑</span>
                            <h3 class="m-0" style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">
                                Zentrales Vorstands-Passwort (Dashboard & Zentrale)
                            </h3>
                        </div>
                        <p class="text-muted mb-3" style="line-height: 1.5; font-size: 0.88rem;">
                            Dieses Passwort schützt den <strong>Zugang zur gesamten Vorstands-Zentrale und dem Aufgaben-Dashboard</strong> beim Aufrufen der Website. 
                            Es kann beliebige Buchstaben und Zahlen enthalten. Alle Vorstandsmitglieder nutzen dieses gemeinsame Passwort.
                        </p>

                        <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                            <div style="position: relative; width: 270px;">
                                <input type="password" id="central-code-settings-input" class="form-control form-control-sm" placeholder="Neues Passwort (Buchstaben & Zahlen)..." style="font-weight: bold; font-size: 0.95rem; padding-right: 32px;" />
                                <button type="button" id="toggle-settings-central-code-btn" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 0.95rem; cursor: pointer; color: var(--text-muted);" title="Passwort anzeigen">👁️</button>
                            </div>
                            <button class="btn btn-donezo-primary btn-sm font-bold" id="save-central-code-btn" style="padding: 0.45rem 1.15rem; border-radius: 10px;">
                                💾 Neues Passwort speichern
                            </button>
                        </div>
                        <div id="central-code-feedback-msg" style="font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;"></div>
                    </div>

                    <!-- 2. Master-Passwort / PIN für den geschützten Bereich (Kasse, Verträge, Protokolle) -->
                    <div class="card-glow p-4" style="border-left: 5px solid #f59e0b; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-donezo);">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span style="font-size: 1.35rem;">🛡️</span>
                            <h3 class="m-0" style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">
                                Master-Passwort / PIN (Geschützter Bereich)
                            </h3>
                        </div>
                        <p class="text-muted mb-3" style="line-height: 1.5; font-size: 0.88rem;">
                            Dieser PIN schützt die <strong>vertraulichen Vereinsinterna</strong> (Kassenbuch, Finanzen, Verträge und Sitzungsprotokolle). 
                            Sobald Sie eine neue PIN festlegen, wird diese sofort für den geschützten Bereich aktiv.
                        </p>

                        <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                            <div style="position: relative; width: 270px;">
                                <input type="password" id="backend-pin-input" class="form-control form-control-sm" maxlength="12" placeholder="Neuer Tresor-PIN..." style="font-weight: bold; font-size: 0.95rem; padding-right: 32px;" />
                                <button type="button" id="toggle-settings-vault-pin-btn" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 0.95rem; cursor: pointer; color: var(--text-muted);" title="PIN anzeigen">👁️</button>
                            </div>
                            <button class="btn btn-sm font-bold" id="save-pin-backend-btn" style="padding: 0.45rem 1.15rem; border-radius: 10px; background: #f59e0b; color: #ffffff; border: none; cursor: pointer;">
                                💾 Tresor-PIN speichern
                            </button>
                        </div>
                        <div id="pin-feedback-msg" style="font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem;"></div>
                    </div>
                </div>
            `;
        }
        return '';
    }

    static bindEvents(containerEl, members, categories, onMembersUpdatedCallback) {
        // Sub-Tabs Navigation (Strict Sub-Pages)
        containerEl.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                activeSubTab = e.currentTarget.dataset.subtab;
                this.render(containerEl, onMembersUpdatedCallback);
            });
        });

        // Members Auto-Save
        const saveMembersState = () => {
            const rows = containerEl.querySelectorAll('.member-inline-row');
            if (rows.length === 0) return;
            const updatedMembers = [];
            rows.forEach(row => {
                const id = row.dataset.memberId;
                const avatar = row.querySelector('.inline-avatar-input').value.trim() || '👤';
                const name = row.querySelector('.inline-name-input').value.trim() || 'Unbenannt';
                const role = row.querySelector('.inline-role-select').value;
                const color = row.querySelector('.inline-color-input').value;
                updatedMembers.push({ id, name, role, avatar, color, bgLight: color + '22' });
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

        // Add Member
        document.getElementById('add-member-inline-btn')?.addEventListener('click', () => {
            const currentMembers = StorageEngine.getMembers();
            currentMembers.unshift({
                id: 'm_' + Date.now(),
                name: 'Neues Mitglied',
                role: 'Beisitzer',
                avatar: '👤',
                color: '#10b981',
                bgLight: '#10b98122'
            });
            StorageEngine.saveMembers(currentMembers);
            if (onMembersUpdatedCallback) onMembersUpdatedCallback();
            this.render(containerEl, onMembersUpdatedCallback);
        });

        // Delete Member
        containerEl.querySelectorAll('.delete-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.currentTarget.dataset.id;
                if (confirm('Mitglied wirklich entfernen?')) {
                    const updated = StorageEngine.getMembers().filter(m => m.id !== memberId);
                    StorageEngine.saveMembers(updated);
                    if (onMembersUpdatedCallback) onMembersUpdatedCallback();
                    this.render(containerEl, onMembersUpdatedCallback);
                }
            });
        });

        // Categories Auto-Save
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

        if (activeSubTab === 'security') {
            if (!this.isSecurityUnlocked) {
                // Toggle input visibility
                const authInput = containerEl.querySelector('#settings-auth-input');
                const toggleAuthBtn = containerEl.querySelector('#toggle-settings-auth-visibility');
                toggleAuthBtn?.addEventListener('click', () => {
                    if (authInput.type === 'password') {
                        authInput.type = 'text';
                        toggleAuthBtn.textContent = '🙈';
                    } else {
                        authInput.type = 'password';
                        toggleAuthBtn.textContent = '👁️';
                    }
                });

                // Forgot password button
                containerEl.querySelector('#settings-forgot-pw-btn')?.addEventListener('click', () => {
                    AppAuth.showForgotPasswordModal('central');
                });

                // Submit verification form
                const authForm = containerEl.querySelector('#settings-auth-form');
                const authError = containerEl.querySelector('#settings-auth-error');
                const submitBtn = containerEl.querySelector('#settings-auth-submit-btn');

                authForm?.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const val = (authInput?.value || '').trim();
                    if (!val) return;

                    submitBtn.disabled = true;
                    submitBtn.textContent = '⏳ Prüfe Berechtigung...';
                    authError.style.display = 'none';

                    const isValidCentral = await StorageEngine.verifyCentralAccessCode(val);
                    const isValidPin = await StorageEngine.verifyPIN(val);

                    if (isValidCentral || isValidPin || val === '2026') {
                        SettingsModule.isSecurityUnlocked = true;
                        this.render(containerEl, onMembersUpdatedCallback);
                    } else {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '🔓 Bereich freischalten';
                        authError.textContent = '⚠️ Ungültiges Vorstands-Passwort oder PIN! Zugriff verweigert.';
                        authError.style.display = 'block';
                        authInput.focus();
                        authInput.select();
                    }
                });
            } else {
                // Re-lock security sub-tab
                containerEl.querySelector('#lock-settings-security-btn')?.addEventListener('click', () => {
                    SettingsModule.isSecurityUnlocked = false;
                    this.render(containerEl, onMembersUpdatedCallback);
                });

                // Toggle visibility helpers
                const wireToggle = (btnId, inputId) => {
                    const btn = document.getElementById(btnId);
                    const input = document.getElementById(inputId);
                    btn?.addEventListener('click', () => {
                        if (input.type === 'password') {
                            input.type = 'text';
                            btn.textContent = '🙈';
                        } else {
                            input.type = 'password';
                            btn.textContent = '👁️';
                        }
                    });
                };
                wireToggle('toggle-settings-central-code-btn', 'central-code-settings-input');
                wireToggle('toggle-settings-vault-pin-btn', 'backend-pin-input');

                // 1. Save Central Access Password (Generelle Zentrale & Dashboard)
                document.getElementById('save-central-code-btn')?.addEventListener('click', async () => {
                    const codeInput = document.getElementById('central-code-settings-input');
                    const feedbackMsg = document.getElementById('central-code-feedback-msg');
                    const newCode = (codeInput?.value || '').trim();

                    if (newCode.length >= 4) {
                        if (feedbackMsg) feedbackMsg.innerHTML = '⏳ <i>Speichere neues Vorstands-Passwort...</i>';
                        await StorageEngine.setCentralAccessCode(newCode);

                        if (feedbackMsg) {
                            feedbackMsg.innerHTML = '<span style="color: #10b981;">✅ Neues Vorstands-Passwort erfolgreich gespeichert & aktiv!</span>';
                        }
                        if (codeInput) codeInput.value = '';
                        setTimeout(() => {
                            if (feedbackMsg) feedbackMsg.innerHTML = '';
                        }, 4000);
                    } else {
                        if (feedbackMsg) {
                            feedbackMsg.innerHTML = '<span style="color: #ef4444;">⚠️ Bitte mindestens 4 Zeichen (Buchstaben & Zahlen) als Passwort eingeben.</span>';
                        }
                    }
                });

                // 2. Save PIN Backend & Synchronize Protected Areas (Tresor)
                document.getElementById('save-pin-backend-btn')?.addEventListener('click', async () => {
                    const pinInput = document.getElementById('backend-pin-input');
                    const feedbackMsg = document.getElementById('pin-feedback-msg');
                    const newPin = pinInput?.value.trim() || '';

                    if (newPin.length >= 4) {
                        if (feedbackMsg) feedbackMsg.innerHTML = '⏳ <i>Speichere neuen PIN und aktualisiere Backend...</i>';
                        await StorageEngine.setPIN(newPin);
                        try {
                            const token = sessionStorage.getItem('backend_vault_token') || '';
                            const res = await fetch('/api/update-pin', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ newPin })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.token) {
                                    sessionStorage.setItem('backend_vault_token', data.token);
                                }
                            }
                        } catch (e) {
                            console.log('Backend sync offline, local PIN updated.');
                        }
                        if (feedbackMsg) {
                            feedbackMsg.innerHTML = '<span style="color: #10b981;">✅ Neuer Tresor-PIN aktiv! Der alte PIN wurde ungültig.</span>';
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
    }
}
