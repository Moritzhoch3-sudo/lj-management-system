/**
 * Settings Module with Compact Full-Width Horizontal Tables
 */
import { BOARD_ROLE_OPTIONS } from '../data.js';
import { StorageEngine } from '../storage.js';
import { SecurityUtils } from '../utils/security.js';

const escapeHTML = SecurityUtils.escapeHTML.bind(SecurityUtils);
let activeSubTab = 'members';

export class SettingsModule {
    static render(containerEl, onMembersUpdatedCallback) {
        const members = StorageEngine.getMembers();
        const categories = StorageEngine.getCategories();
        const currentPin = StorageEngine.getPIN();

        containerEl.innerHTML = `
            <div class="settings-wrapper w-100">
                <!-- Header Banner -->
                <div class="section-banner settings-banner mb-3">
                    <div class="banner-title">
                        <h2>⚙️ Einstellungen & Vorstands-Verwaltung</h2>
                        <p>Verwalte Vorstandsmitglieder, Kategorien und Bereichs-Sicherheit.</p>
                    </div>
                </div>

                <!-- Sub-Tabs Navigation -->
                <div class="sub-tabs-bar mb-3">
                    <button class="sub-tab-btn ${activeSubTab === 'members' ? 'active' : ''}" data-subtab="members">
                        👥 Mitglieder (${members.length})
                    </button>
                    <button class="sub-tab-btn ${activeSubTab === 'categories' ? 'active' : ''}" data-subtab="categories">
                        🏷️ Kategorien (${categories.length})
                    </button>
                    <button class="sub-tab-btn ${activeSubTab === 'security' ? 'active' : ''}" data-subtab="security">
                        🔒 Admin-PIN
                    </button>
                </div>

                <!-- Sub-Tab 1: Members Management (Full Width Compact Table) -->
                <div class="sub-tab-content ${activeSubTab === 'members' ? '' : 'hidden'}" id="subtab-members-view">
                    <div class="card-glow mb-3 p-3">
                        <div class="toolbar-row d-flex justify-content-between align-items-center mb-2">
                            <h3 class="m-0">👥 Vorstandsmitglieder (${members.length} Personen)</h3>
                            <button class="btn btn-primary btn-sm" id="add-member-inline-btn">➕ Neues Mitglied</button>
                        </div>

                        <div class="table-responsive mt-2">
                            <table class="settings-table clean-tasks-table w-100">
                                <thead>
                                    <tr>
                                        <th style="width: 60px;">Icon</th>
                                        <th>Name des Mitglieds</th>
                                        <th style="width: 240px;">Vorstandsposition / Amt</th>
                                        <th style="width: 100px;">Kennfarbe</th>
                                        <th style="width: 70px; text-align: center;">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${members.map(m => `
                                        <tr data-member-id="${m.id}" class="member-inline-row">
                                            <td>
                                                <input type="text" class="form-control form-control-sm inline-avatar-input text-center" value="${escapeHTML(m.avatar)}" style="width: 45px;" />
                                            </td>
                                            <td>
                                                <input type="text" class="form-control form-control-sm inline-name-input" value="${escapeHTML(m.name)}" placeholder="Name eingeben..." />
                                            </td>
                                            <td>
                                                <select class="form-select form-select-sm inline-role-select">
                                                    ${BOARD_ROLE_OPTIONS.map(r => `
                                                        <option value="${r}" ${m.role.startsWith(r) || m.role.includes(r) ? 'selected' : ''}>${r}</option>
                                                    `).join('')}
                                                    <option value="${escapeHTML(m.role)}" ${!BOARD_ROLE_OPTIONS.some(r => m.role.startsWith(r)) ? 'selected' : ''}>Sonstiges (${escapeHTML(m.role)})</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="color" class="form-control form-control-sm inline-color-input" value="${m.color || '#10b981'}" style="height: 34px; padding: 2px; cursor: pointer;" />
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
                </div>

                <!-- Sub-Tab 2: Categories Management (Full Width Compact Table) -->
                <div class="sub-tab-content ${activeSubTab === 'categories' ? '' : 'hidden'}" id="subtab-categories-view">
                    <div class="card-glow mb-3 p-3">
                        <div class="toolbar-row d-flex justify-content-between align-items-center mb-2">
                            <h3 class="m-0">🏷️ Aufgaben-Kategorien (${categories.length})</h3>
                            <button class="btn btn-primary btn-sm" id="add-category-btn">➕ Neue Kategorie</button>
                        </div>

                        <div class="table-responsive mt-2">
                            <table class="settings-table clean-tasks-table w-100">
                                <thead>
                                    <tr>
                                        <th style="width: 60px;">Icon</th>
                                        <th>Kategorie-Name</th>
                                        <th style="width: 100px;">Farbe</th>
                                        <th style="width: 70px; text-align: center;">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${categories.map(c => `
                                        <tr data-cat-id="${c.id}" class="category-inline-row">
                                            <td>
                                                <input type="text" class="form-control form-control-sm cat-icon-input text-center" value="${escapeHTML(c.icon)}" style="width: 45px;" />
                                            </td>
                                            <td>
                                                <input type="text" class="form-control form-control-sm cat-name-input" value="${escapeHTML(c.name)}" placeholder="Kategorie Name..." />
                                            </td>
                                            <td>
                                                <input type="color" class="form-control form-control-sm cat-color-input" value="${c.color || '#3b82f6'}" style="height: 34px; padding: 2px; cursor: pointer;" />
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
                </div>

                <!-- Sub-Tab 3: Security & Master PIN -->
                <div class="sub-tab-content ${activeSubTab === 'security' ? '' : 'hidden'}" id="subtab-security-view">
                    <div class="card-glow mb-3 p-3">
                        <h3 class="m-0 mb-2">🔒 Admin-PIN & Backend-Sicherheit</h3>
                        <p class="text-muted mb-3 font-size-sm">Die Authentifizierung erfolgt gehasht über das Backend.</p>
                        
                        <div class="d-flex align-items-center gap-2">
                            <label style="font-weight: 700;">Aktueller Admin-PIN:</label>
                            <input type="text" id="backend-pin-input" class="form-control form-control-sm" maxlength="8" value="${currentPin}" style="max-width: 140px; font-weight: bold; text-align: center;" />
                            <button class="btn btn-emerald btn-sm" id="save-pin-backend-btn">💾 Speichern</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, members, categories, onMembersUpdatedCallback);
    }

    static bindEvents(containerEl, members, categories, onMembersUpdatedCallback) {
        // Sub-Tabs Navigation
        containerEl.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                activeSubTab = e.currentTarget.dataset.subtab;
                this.render(containerEl, onMembersUpdatedCallback);
            });
        });

        // Members Auto-Save
        const saveMembersState = () => {
            const rows = containerEl.querySelectorAll('.member-inline-row');
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
            const updatedCats = [];
            rows.forEach(row => {
                const id = row.dataset.catId;
                const icon = row.querySelector('.cat-icon-input').value.trim() || '📁';
                const name = row.querySelector('.cat-name-input').value.trim() || 'Kategorie';
                const color = row.querySelector('.cat-color-input').value;
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

        // Save PIN Backend
        document.getElementById('save-pin-backend-btn')?.addEventListener('click', async () => {
            const newPin = document.getElementById('backend-pin-input').value.trim();
            if (newPin.length >= 4) {
                StorageEngine.setPIN(newPin);
                try {
                    const token = sessionStorage.getItem('backend_vault_token') || '';
                    await fetch('/api/update-pin', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ newPin })
                    });
                } catch (e) {}
                alert(`✅ Backend PIN erfolgreich auf "${newPin}" aktualisiert!`);
            } else {
                alert('⚠️ Bitte mindestens 4 Zeichen als PIN eingeben.');
            }
        });
    }
}
