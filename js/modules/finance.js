/**
 * Finance & Cashbook Module (PIN Protected)
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

                <!-- Action Bar -->
                <div class="toolbar-row">
                    <h3>📜 Transaktions-Journal (${finances.length} Einträge)</h3>
                    <button class="btn btn-primary btn-glow" id="add-finance-btn">➕ Neue Buchung erfassen</button>
                </div>

                <!-- Finance Table -->
                <div class="card-glow table-responsive">
                    <table class="finance-table">
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Verwendungszweck / Titel</th>
                                <th>Kategorie</th>
                                <th>Beleg-Nr.</th>
                                <th>Typ</th>
                                <th>Betrag</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${finances.length === 0 ? `
                                <tr><td colspan="7" class="text-center p-4">Keine Buchungen vorhanden.</td></tr>
                            ` : finances.map(f => `
                                <tr>
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
                                        <button class="btn btn-sm btn-ghost danger-text delete-finance-btn" data-id="${f.id}">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, finances);
    }

    static bindEvents(containerEl, finances) {
        document.getElementById('add-finance-btn')?.addEventListener('click', () => {
            this.openFinanceModal(containerEl);
        });

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

    static openFinanceModal(mainContainerEl) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        modal.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>➕ Neue Buchung erfassen</h3>
                    <button class="btn btn-ghost modal-close">&times;</button>
                </div>
                <form id="finance-form">
                    <div class="form-group">
                        <label>Titel / Verwendungszweck *</label>
                        <input type="text" id="fin-title" class="form-control" required placeholder="z. B. Getränkeeinkauf Brauerei" />
                    </div>

                    <div class="form-row">
                        <div class="form-group col">
                            <label>Typ</label>
                            <select id="fin-type" class="form-select">
                                <option value="einnahme">📈 Einnahme (+)</option>
                                <option value="ausgabe">📉 Ausgabe (-)</option>
                            </select>
                        </div>
                        <div class="form-group col">
                            <label>Betrag (€) *</label>
                            <input type="number" step="0.01" id="fin-amount" class="form-control" required placeholder="150.00" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col">
                            <label>Kategorie</label>
                            <input type="text" id="fin-category" class="form-control" placeholder="Events, Gebühren, Sponsoring, Instandhaltung" />
                        </div>
                        <div class="form-group col">
                            <label>Beleg-Nr. / Quittung</label>
                            <input type="text" id="fin-receipt" class="form-control" placeholder="BELEG-2026-..." />
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Datum</label>
                        <input type="date" id="fin-date" class="form-control" value="${new Date().toISOString().slice(0,10)}" />
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-ghost modal-close">Abbrechen</button>
                        <button type="submit" class="btn btn-primary btn-glow">Buchung speichern</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => modal.remove()));

        document.getElementById('finance-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const finances = StorageEngine.getFinances();

            const title = document.getElementById('fin-title').value;
            const type = document.getElementById('fin-type').value;
            const amount = parseFloat(document.getElementById('fin-amount').value);
            const category = document.getElementById('fin-category').value;
            const receipt = document.getElementById('fin-receipt').value;
            const date = document.getElementById('fin-date').value;

            const newEntry = {
                id: 'f_' + Date.now(),
                title,
                type,
                amount,
                category,
                receipt,
                date
            };

            finances.unshift(newEntry);
            StorageEngine.saveFinances(finances);
            modal.remove();
            this.render(mainContainerEl);
        });
    }
}
