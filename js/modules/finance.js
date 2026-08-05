/**
 * Finance & Cashbook Module - Direct In-Box & In-Table Creation & Editing (PIN Protected)
 */
import { StorageEngine } from '../storage.js';

export class FinanceModule {
    static render(containerEl) {
        const finances = StorageEngine.getFinances();

        // Calculate metrics
        const totalEinnahmen = finances.filter(f => f.type === 'einnahme').reduce((sum, f) => sum + f.amount, 0);
        const totalAusgaben = finances.filter(f => f.type === 'ausgabe').reduce((sum, f) => sum + Math.abs(f.amount), 0);
        const kassenstand = totalEinnahmen - totalAusgaben;

        containerEl.innerHTML = `
            <div class="finance-wrapper">
                <!-- Header & Lock Status -->
                <div class="section-banner finance-banner">
                    <div class="banner-title">
                        <h2>💰 Finanzen & Kassenbuch</h2>
                        <p>PIN-Geschützter Vorstands-Bereich für Einnahmen, Ausgaben und Belegnachweisung.</p>
                    </div>
                    <button class="btn btn-sm btn-ghost lock-vault-btn" id="relock-finance-btn">🔒 Bereich wieder sperren</button>
                </div>

                <!-- Financial Summary Cards -->
                <div class="metrics-grid">
                    <div class="metric-card card-glow">
                        <div class="metric-icon" style="background: rgba(34, 197, 94, 0.15); color: #22c55e;">📈</div>
                        <div class="metric-body">
                            <span class="metric-value text-success">${kassenstand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            <span class="metric-label">Aktueller Kassenstand</span>
                        </div>
                    </div>
                    <div class="metric-card card-glow">
                        <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">➕</div>
                        <div class="metric-body">
                            <span class="metric-value">+${totalEinnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            <span class="metric-label">Gesamte Einnahmen</span>
                        </div>
                    </div>
                    <div class="metric-card card-glow">
                        <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">➖</div>
                        <div class="metric-body">
                            <span class="metric-value text-danger">-${totalAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            <span class="metric-label">Gesamte Ausgaben</span>
                        </div>
                    </div>
                </div>

                <!-- DIRECT INLINE TRANSACTION CREATION & JOURNAL IN THE BOX -->
                <div class="card-glow mb-4">
                    <div class="toolbar-row mb-3">
                        <h3>📜 Transaktions-Journal (${finances.length} Einträge)</h3>
                    </div>

                    <!-- DIRECT INLINE QUICK-ADD FORM AT TOP OF TABLE BOX -->
                    <div class="card-inline-add-bar mb-3 p-3" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px;">
                        <h4 class="mb-2" style="font-size: 0.95rem; color: #34d399;">➕ Neue Buchung / Ausgabe direkt hier erfassen:</h4>
                        <form id="inline-finance-add-form">
                            <div class="row g-2">
                                <div class="col-md-2">
                                    <label class="form-label small mb-1">Datum</label>
                                    <input type="date" id="add-fin-date" class="form-control form-control-sm" value="${new Date().toISOString().slice(0,10)}" required />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small mb-1">Verwendungszweck / Titel *</label>
                                    <input type="text" id="add-fin-title" class="form-control form-control-sm" placeholder="z. B. Getränkeeinkauf Brauerei" required />
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small mb-1">Typ</label>
                                    <select id="add-fin-type" class="form-select form-select-sm">
                                        <option value="ausgabe" selected>📉 Ausgabe (-)</option>
                                        <option value="einnahme">📈 Einnahme (+)</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small mb-1">Betrag (€) *</label>
                                    <input type="number" step="0.01" id="add-fin-amount" class="form-control form-control-sm" placeholder="0.00" required />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small mb-1">Kategorie</label>
                                    <input type="text" id="add-fin-category" class="form-control form-control-sm" placeholder="Feste, Equipment..." />
                                </div>
                            </div>
                            <div class="row g-2 mt-1 align-items-end">
                                <div class="col-md-4">
                                    <label class="form-label small mb-1">Beleg-Nr. / Quittung</label>
                                    <input type="text" id="add-fin-receipt" class="form-control form-control-sm" placeholder="BELEG-2026-..." />
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label small mb-1">Notizen / Details</label>
                                    <input type="text" id="add-fin-notes" class="form-control form-control-sm" placeholder="Anmerkungen..." />
                                </div>
                                <div class="col-md-3 text-end">
                                    <button type="submit" class="btn btn-sm btn-emerald w-100">➕ Buchung Speichern</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Finance Table with Direct Inline Editing -->
                    <div class="table-responsive">
                        <table class="finance-table">
                            <thead>
                                <tr>
                                    <th style="width: 110px;">Datum</th>
                                    <th>Verwendungszweck & Notiz</th>
                                    <th style="width: 140px;">Kategorie</th>
                                    <th style="width: 130px;">Beleg-Nr.</th>
                                    <th style="width: 110px;">Typ</th>
                                    <th style="width: 120px;">Betrag</th>
                                    <th style="width: 120px;">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${finances.length === 0 ? `
                                    <tr><td colspan="7" class="text-center p-4">Keine Buchungen vorhanden. Nutzen Sie das Formular oben, um eine hinzuzufügen.</td></tr>
                                ` : finances.map(f => `
                                    <tr class="finance-row">
                                        <td>${f.date}</td>
                                        <td>
                                            <strong>${f.title}</strong>
                                            ${f.notes ? `<br><small class="text-muted">${f.notes}</small>` : ''}
                                        </td>
                                        <td><span class="badge badge-neutral">${f.category || 'Allgemein'}</span></td>
                                        <td><code>${f.receipt || '-'}</code></td>
                                        <td>
                                            <span class="badge ${f.type === 'einnahme' ? 'badge-success' : 'badge-danger'}">
                                                ${f.type === 'einnahme' ? 'Einnahme' : 'Ausgabe'}
                                            </span>
                                        </td>
                                        <td class="${f.type === 'einnahme' ? 'text-success font-bold' : 'text-danger font-bold'}">
                                            ${f.type === 'einnahme' ? '+' : '-'}${Math.abs(f.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td>
                                            <div class="table-action-btns">
                                                <button class="btn btn-sm btn-ghost toggle-fin-edit-btn" data-id="${f.id}" title="Direkt in der Zeile bearbeiten">✏️ Edit</button>
                                                <button class="btn btn-sm btn-ghost danger-text delete-finance-btn" data-id="${f.id}" title="Löschen">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- INLINE EDITABLE ROW -->
                                    <tr class="inline-edit-finance-row hidden" id="inline-fin-edit-${f.id}">
                                        <td colspan="7" style="background: rgba(0,0,0,0.4); padding: 0.8rem; border-top: 1px dashed var(--border-color);">
                                            <form class="inline-fin-edit-form" data-id="${f.id}">
                                                <div class="d-flex align-items-center justify-content-between mb-2">
                                                    <strong style="color: #34d399; font-size: 0.9rem;">✏️ Buchung direkt in der Tabelle bearbeiten</strong>
                                                    <button type="button" class="btn btn-sm btn-ghost cancel-fin-edit-btn" data-id="${f.id}">✖️ Schließen</button>
                                                </div>

                                                <div class="row g-2 mb-2">
                                                    <div class="col-md-2">
                                                        <label class="form-label small mb-1">Datum</label>
                                                        <input type="date" class="form-control form-control-sm fin-edit-date" value="${f.date}" required />
                                                    </div>
                                                    <div class="col-md-3">
                                                        <label class="form-label small mb-1">Titel / Verwendungszweck *</label>
                                                        <input type="text" class="form-control form-control-sm fin-edit-title" value="${f.title}" required />
                                                    </div>
                                                    <div class="col-md-2">
                                                        <label class="form-label small mb-1">Typ</label>
                                                        <select class="form-select form-select-sm fin-edit-type">
                                                            <option value="ausgabe" ${f.type === 'ausgabe' ? 'selected' : ''}>📉 Ausgabe (-)</option>
                                                            <option value="einnahme" ${f.type === 'einnahme' ? 'selected' : ''}>📈 Einnahme (+)</option>
                                                        </select>
                                                    </div>
                                                    <div class="col-md-2">
                                                        <label class="form-label small mb-1">Betrag (€)</label>
                                                        <input type="number" step="0.01" class="form-control form-control-sm fin-edit-amount" value="${Math.abs(f.amount)}" required />
                                                    </div>
                                                    <div class="col-md-3">
                                                        <label class="form-label small mb-1">Kategorie</label>
                                                        <input type="text" class="form-control form-control-sm fin-edit-category" value="${f.category || ''}" />
                                                    </div>
                                                </div>

                                                <div class="row g-2 align-items-end">
                                                    <div class="col-md-4">
                                                        <label class="form-label small mb-1">Beleg-Nr.</label>
                                                        <input type="text" class="form-control form-control-sm fin-edit-receipt" value="${f.receipt || ''}" />
                                                    </div>
                                                    <div class="col-md-5">
                                                        <label class="form-label small mb-1">Notizen</label>
                                                        <input type="text" class="form-control form-control-sm fin-edit-notes" value="${f.notes || ''}" />
                                                    </div>
                                                    <div class="col-md-3 text-end">
                                                        <button type="submit" class="btn btn-sm btn-emerald w-100">💾 Speichern</button>
                                                    </div>
                                                </div>
                                            </form>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, finances);
    }

    static bindEvents(containerEl, finances) {
        // Direct Inline Quick-Add Submission
        document.getElementById('inline-finance-add-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('add-fin-date').value;
            const title = document.getElementById('add-fin-title').value.trim();
            const type = document.getElementById('add-fin-type').value;
            const amount = parseFloat(document.getElementById('add-fin-amount').value);
            const category = document.getElementById('add-fin-category').value.trim();
            const receipt = document.getElementById('add-fin-receipt').value.trim();
            const notes = document.getElementById('add-fin-notes').value.trim();

            if (!title || isNaN(amount)) return;

            const currentFinances = StorageEngine.getFinances();
            currentFinances.unshift({
                id: 'f_' + Date.now(),
                date,
                title,
                type,
                amount,
                category,
                receipt,
                notes
            });

            StorageEngine.saveFinances(currentFinances);
            this.render(containerEl);
        });

        // Toggle Edit Row
        containerEl.querySelectorAll('.toggle-fin-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const editRow = containerEl.querySelector(`#inline-fin-edit-${id}`);
                if (editRow) {
                    editRow.classList.toggle('hidden');
                }
            });
        });

        // Cancel Edit Row
        containerEl.querySelectorAll('.cancel-fin-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const editRow = containerEl.querySelector(`#inline-fin-edit-${id}`);
                if (editRow) {
                    editRow.classList.add('hidden');
                }
            });
        });

        // Save Edit Row
        containerEl.querySelectorAll('.inline-fin-edit-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = form.dataset.id;
                const currentFinances = StorageEngine.getFinances();
                const idx = currentFinances.findIndex(f => f.id === id);

                if (idx !== -1) {
                    const date = form.querySelector('.fin-edit-date').value;
                    const title = form.querySelector('.fin-edit-title').value.trim();
                    const type = form.querySelector('.fin-edit-type').value;
                    const amount = parseFloat(form.querySelector('.fin-edit-amount').value);
                    const category = form.querySelector('.fin-edit-category').value.trim();
                    const receipt = form.querySelector('.fin-edit-receipt').value.trim();
                    const notes = form.querySelector('.fin-edit-notes').value.trim();

                    if (!title || isNaN(amount)) return;

                    currentFinances[idx] = {
                        ...currentFinances[idx],
                        date,
                        title,
                        type,
                        amount,
                        category,
                        receipt,
                        notes
                    };

                    StorageEngine.saveFinances(currentFinances);
                    this.render(containerEl);
                }
            });
        });

        // Delete button
        containerEl.querySelectorAll('.delete-finance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Buchung wirklich löschen?')) {
                    const updated = finances.filter(f => f.id !== id);
                    StorageEngine.saveFinances(updated);
                    this.render(containerEl);
                }
            });
        });
    }
}
