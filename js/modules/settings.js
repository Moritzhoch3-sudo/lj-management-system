/**
 * Settings Module with 1-Minute Auto-Save Timer Interval
 */
import { BOARD_ROLE_OPTIONS } from '../data.js';
import { StorageEngine } from '../storage.js';

let saveTimerInterval = null;
let pendingChanges = false;
let secondsUntilNextSave = 60;

export class SettingsModule {
    static render(containerEl, onMembersUpdatedCallback) {
        const members = StorageEngine.getMembers();
        const currentPin = StorageEngine.getPIN();

        // Reset timer state
        if (saveTimerInterval) clearInterval(saveTimerInterval);
        secondsUntilNextSave = 60;
        pendingChanges = false;

        containerEl.innerHTML = `
            <div class="settings-wrapper">
                <!-- Banner -->
                <div class="section-banner settings-banner">
                    <div class="banner-title">
                        <h2>⚙️ Einstellungen & Vorstands-Verwaltung</h2>
                        <p>Änderungen werden <strong>automatisch jede Minute (60 Sek.)</strong> im Hintergrund gespeichert.</p>
                    </div>
                </div>

                <!-- Member Management Table (1-Min Auto-Save) -->
                <div class="card-glow mb-4">
                    <div class="toolbar-row">
                        <h3>👥 Vorstandsmitglieder (${members.length} Personen)</h3>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge badge-neutral" id="save-countdown-badge">⏱️ Nächstes Speichern in 60s</span>
                            <button class="btn btn-emerald btn-sm" id="manual-save-now-btn">💾 Jetzt speichern</button>
                            <button class="btn btn-primary btn-sm" id="add-member-inline-btn">➕ Neues Mitglied</button>
                        </div>
                    </div>

                    <div class="table-responsive mt-3">
                        <table class="settings-table inline-edit-table">
                            <thead>
                                <tr>
                                    <th style="width: 70px;">Avatar</th>
                                    <th>Name des Mitglieds</th>
                                    <th>Vorstandsposition / Amt</th>
                                    <th style="width: 120px;">Kennfarbe</th>
                                    <th style="width: 90px;">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${members.map(m => `
                                    <tr data-member-id="${m.id}" class="member-inline-row">
                                        <td>
                                            <input type="text" class="form-control form-control-sm inline-avatar-input interval-field" value="${m.avatar}" style="width: 45px; text-align: center;" />
                                        </td>
                                        <td>
                                            <input type="text" class="form-control form-control-sm inline-name-input interval-field" value="${m.name}" placeholder="Name eingeben..." />
                                        </td>
                                        <td>
                                            <select class="form-select form-select-sm inline-role-select interval-field">
                                                ${BOARD_ROLE_OPTIONS.map(r => `
                                                    <option value="${r}" ${m.role.startsWith(r) || m.role.includes(r) ? 'selected' : ''}>${r}</option>
                                                `).join('')}
                                                <option value="${m.role}" ${!BOARD_ROLE_OPTIONS.some(r => m.role.startsWith(r)) ? 'selected' : ''}>Sonstiges (${m.role})</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input type="color" class="form-control form-control-sm inline-color-input interval-field" value="${m.color}" style="height: 38px; cursor: pointer;" />
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-ghost danger-text delete-member-btn" data-id="${m.id}" title="Löschen">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- PIN & Security Settings Section -->
                <div class="card-glow">
                    <h3>🔒 Sicherheits-PIN für Finanzen & Protokolle</h3>
                    
                    <div class="form-group inline-group mt-2">
                        <label>Master-PIN:</label>
                        <input type="text" id="interval-pin-input" class="form-control form-control-sm interval-field" maxlength="8" value="${currentPin}" style="max-width: 150px; font-weight: bold; letter-spacing: 2px;" />
                        <span class="text-muted font-size-sm">⏱️ Speichert im 1-Minuten Intervall</span>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, members, onMembersUpdatedCallback);
        this.start1MinAutoSaveTimer(containerEl, onMembersUpdatedCallback);
    }

    static start1MinAutoSaveTimer(containerEl, onMembersUpdatedCallback) {
        const badge = document.getElementById('save-countdown-badge');

        saveTimerInterval = setInterval(() => {
            secondsUntilNextSave--;

            if (badge) {
                if (pendingChanges) {
                    badge.textContent = `⏱️ Speichert in ${secondsUntilNextSave}s (Änderungen vorhanden)`;
                    badge.style.color = '#fbbf24';
                } else {
                    badge.textContent = `⏱️ Nächstes Speichern in ${secondsUntilNextSave}s`;
                    badge.style.color = '#94a3b8';
                }
            }

            if (secondsUntilNextSave <= 0) {
                secondsUntilNextSave = 60;
                if (pendingChanges) {
                    this.executeSaveAll(containerEl, onMembersUpdatedCallback);
                }
            }
        }, 1000);
    }

    static executeSaveAll(containerEl, onMembersUpdatedCallback) {
        const badge = document.getElementById('save-countdown-badge');
        const rows = containerEl.querySelectorAll('.member-inline-row');
        const updatedMembers = [];

        rows.forEach(row => {
            const memberId = row.dataset.memberId;
            const avatar = row.querySelector('.inline-avatar-input').value.trim() || '👤';
            const name = row.querySelector('.inline-name-input').value.trim() || 'Unbenannt';
            const role = row.querySelector('.inline-role-select').value;
            const color = row.querySelector('.inline-color-input').value;
            const bgLight = color + '22';

            updatedMembers.push({
                id: memberId,
                name,
                role,
                avatar,
                color,
                bgLight
            });
        });

        if (updatedMembers.length > 0) {
            StorageEngine.saveMembers(updatedMembers);
        }

        // Save PIN if changed
        const pinInput = document.getElementById('interval-pin-input');
        if (pinInput && pinInput.value.trim().length >= 4) {
            StorageEngine.setPIN(pinInput.value.trim());
        }

        pendingChanges = false;
        secondsUntilNextSave = 60;

        if (badge) {
            badge.textContent = '✅ Automatisch gespeichert!';
            badge.style.color = '#34d399';
            setTimeout(() => {
                badge.textContent = `⏱️ Nächstes Speichern in 60s`;
                badge.style.color = '#94a3b8';
            }, 2000);
        }

        if (onMembersUpdatedCallback) onMembersUpdatedCallback();
    }

    static bindEvents(containerEl, members, onMembersUpdatedCallback) {
        // Track typing / change without immediate LocalStorage write
        containerEl.querySelectorAll('.interval-field').forEach(field => {
            field.addEventListener('input', () => {
                pendingChanges = true;
            });
            field.addEventListener('change', () => {
                pendingChanges = true;
            });
        });

        // Manual instant save button
        document.getElementById('manual-save-now-btn')?.addEventListener('click', () => {
            this.executeSaveAll(containerEl, onMembersUpdatedCallback);
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

        // Add Member
        document.getElementById('add-member-inline-btn')?.addEventListener('click', () => {
            // Save current changes first
            this.executeSaveAll(containerEl, onMembersUpdatedCallback);

            const currentMembers = StorageEngine.getMembers();
            currentMembers.unshift({
                id: 'm_' + Date.now(),
                name: 'Neues Mitglied',
                role: 'Beisitzer',
                avatar: '👤',
                color: '#3b82f6',
                bgLight: '#3b82f622'
            });
            StorageEngine.saveMembers(currentMembers);
            if (onMembersUpdatedCallback) onMembersUpdatedCallback();
            this.render(containerEl, onMembersUpdatedCallback);
        });
    }
}
