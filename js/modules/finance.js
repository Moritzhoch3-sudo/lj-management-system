/**
 * Finance & Cashbook Module - Direct In-Box & In-Table Creation & Editing (PIN Protected)
 * Supports interactive metric detail popups & color-coded responsive mobile card boxes.
 */
import { StorageEngine, escapeHTML } from '../storage.js';

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

                <!-- Financial Summary Cards (CLICKABLE POPUP MODALS) -->
                <div class="metrics-grid">
                    <div class="metric-card card-glow" data-finance-metric="kassenstand" title="Kassenstand-Details & Bilanz öffnen" style="cursor: pointer;">
                        <div class="metric-icon" style="background: rgba(34, 197, 94, 0.15); color: #22c55e;">📈</div>
                        <div class="metric-body">
                            <span class="metric-value text-success">${kassenstand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            <span class="metric-label">Aktueller Kassenstand <small style="color: #34d399; font-weight: bold;">(🔍 Details)</small></span>
                        </div>
                    </div>
                    <div class="metric-card card-glow" data-finance-metric="einnahmen" title="Einnahmen-Aufschlüsselung öffnen" style="cursor: pointer;">
                        <div class="metric-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">➕</div>
                        <div class="metric-body">
                            <span class="metric-value">+${totalEinnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            <span class="metric-label">Gesamte Einnahmen <small style="color: #34d399; font-weight: bold;">(🔍 Details)</small></span>
                        </div>
                    </div>
                    <div class="metric-card card-glow" data-finance-metric="ausgaben" title="Ausgaben-Aufschlüsselung öffnen" style="cursor: pointer;">
                        <div class="metric-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">➖</div>
                        <div class="metric-body">
                            <span class="metric-value text-danger">-${totalAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            <span class="metric-label">Gesamte Ausgaben <small style="color: #f87171; font-weight: bold;">(🔍 Details)</small></span>
                        </div>
                    </div>
                </div>

                <!-- DIRECT INLINE TRANSACTION CREATION & JOURNAL IN THE BOX -->
                <div class="card-glow mb-4 p-3">
                    <div class="toolbar-row mb-3 d-flex align-items-center justify-content-between">
                        <h3>📜 Transaktions-Journal (${finances.length} Einträge)</h3>
                    </div>

                    <!-- DIRECT INLINE QUICK-ADD FORM AT TOP OF TABLE BOX -->
                    <div class="card-inline-add-bar mb-3 p-3" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px;">
                        <h4 class="mb-3" style="font-size: 1rem; color: #34d399; font-weight: 700;">➕ Neue Buchung / Ausgabe erfassen:</h4>
                        <form id="inline-finance-add-form">
                            <div class="row g-2 mb-2">
                                <div class="col-12 col-sm-4 col-md-3">
                                    <label class="form-label small font-bold text-muted mb-1">📅 Datum *</label>
                                    <input type="date" id="add-fin-date" class="form-control form-control-sm" value="${new Date().toISOString().slice(0,10)}" required style="font-size: 15px;" />
                                </div>
                                <div class="col-12 col-sm-8 col-md-9">
                                    <label class="form-label small font-bold text-muted mb-1">📝 Verwendungszweck / Titel *</label>
                                    <input type="text" id="add-fin-title" class="form-control form-control-sm" placeholder="z. B. Getränkeeinkauf Brauerei" required style="font-size: 15px;" />
                                </div>
                            </div>

                            <div class="row g-2 mb-2">
                                <div class="col-6 col-md-3">
                                    <label class="form-label small font-bold text-muted mb-1">📊 Typ *</label>
                                    <select id="add-fin-type" class="form-select form-select-sm" style="font-size: 15px;">
                                        <option value="ausgabe" selected>📉 Ausgabe (-)</option>
                                        <option value="einnahme">📈 Einnahme (+)</option>
                                    </select>
                                </div>
                                <div class="col-6 col-md-3">
                                    <label class="form-label small font-bold text-muted mb-1">💶 Betrag (€) *</label>
                                    <input type="number" step="0.01" id="add-fin-amount" class="form-control form-control-sm" placeholder="0.00" required style="font-size: 15px;" />
                                </div>
                                <div class="col-12 col-md-6">
                                    <label class="form-label small font-bold text-muted mb-1">🏷️ Kategorie</label>
                                    <input type="text" id="add-fin-category" class="form-control form-control-sm" placeholder="z. B. Feste, Equipment..." style="font-size: 15px;" />
                                </div>
                            </div>

                            <div class="row g-2 align-items-end">
                                <div class="col-12 col-md-4">
                                    <label class="form-label small font-bold text-muted mb-1">🧾 Beleg-Nr. / Quittung</label>
                                    <input type="text" id="add-fin-receipt" class="form-control form-control-sm" placeholder="BELEG-2026-..." style="font-size: 15px;" />
                                </div>
                                <div class="col-12 col-md-5">
                                    <label class="form-label small font-bold text-muted mb-1">💬 Notizen / Details</label>
                                    <input type="text" id="add-fin-notes" class="form-control form-control-sm" placeholder="Anmerkungen..." style="font-size: 15px;" />
                                </div>
                                <div class="col-12 col-md-3 text-end">
                                    <button type="submit" class="btn btn-emerald w-100 mt-2 mt-md-0" style="padding: 0.55rem; font-weight: 700; font-size: 0.9rem;">
                                        ➕ Buchung Speichern
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- DESKTOP TABLE VIEW (Hidden on Mobile screens <= 768px) -->
                    <div class="table-responsive finance-desktop-table d-none d-md-block">
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
                                            <strong>${escapeHTML(f.title)}</strong>
                                            ${f.notes ? `<br><small class="text-muted">${escapeHTML(f.notes)}</small>` : ''}
                                        </td>
                                        <td><span class="badge badge-neutral">${escapeHTML(f.category || 'Allgemein')}</span></td>
                                        <td><code>${escapeHTML(f.receipt || '-')}</code></td>
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
                                                <button class="btn btn-sm btn-ghost toggle-fin-edit-btn" data-id="${f.id}" title="Direkt bearbeiten">✏️ Edit</button>
                                                <button class="btn btn-sm btn-ghost danger-text delete-finance-btn" data-id="${f.id}" title="Löschen">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- INLINE EDITABLE ROW (DESKTOP) -->
                                    <tr class="inline-edit-finance-row hidden" id="inline-fin-edit-desktop-${f.id}">
                                        <td colspan="7" style="background: rgba(0,0,0,0.4); padding: 0.8rem; border-top: 1px dashed var(--border-color);">
                                            ${this.renderEditFormHtml(f, 'desktop')}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- MOBILE CARD BOXES VIEW (Shown on Mobile screens <= 768px) -->
                    <div class="finance-mobile-cards d-block d-md-none">
                        ${finances.length === 0 ? `
                            <div class="text-center p-4 text-muted">Keine Buchungen vorhanden.</div>
                        ` : finances.map(f => `
                            <div class="finance-mobile-card mb-3 p-3 card-glow" id="fin-card-${f.id}"
                                 style="${f.type === 'einnahme' 
                                     ? 'background: rgba(16, 185, 129, 0.08); border-left: 5px solid #10b981; border-color: rgba(16, 185, 129, 0.3);' 
                                     : 'background: rgba(239, 68, 68, 0.08); border-left: 5px solid #ef4444; border-color: rgba(239, 68, 68, 0.3);'} border-radius: 10px;">
                                
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="badge ${f.type === 'einnahme' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.8rem;">
                                        ${f.type === 'einnahme' ? '📈 Einnahme (+)' : '📉 Ausgabe (-)'}
                                    </span>
                                    <span class="font-bold ${f.type === 'einnahme' ? 'text-success' : 'text-danger'}" style="font-size: 1.15rem;">
                                        ${f.type === 'einnahme' ? '+' : '-'}${Math.abs(f.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                </div>

                                <h4 style="font-size: 1.05rem; color: #fff; margin-bottom: 0.35rem; font-weight: 700;">
                                    ${escapeHTML(f.title)}
                                </h4>

                                <div class="d-flex flex-wrap align-items-center gap-2 mb-2" style="font-size: 0.8rem; color: var(--text-muted);">
                                    <span>📅 ${f.date}</span>
                                    <span>•</span>
                                    <span class="badge badge-neutral">${escapeHTML(f.category || 'Allgemein')}</span>
                                    ${f.receipt ? `<span>•</span> <code>${escapeHTML(f.receipt)}</code>` : ''}
                                </div>

                                ${f.notes ? `<div class="p-2 mb-2 rounded" style="background: rgba(0,0,0,0.3); font-size: 0.82rem; color: #cbd5e1;">📝 ${escapeHTML(f.notes)}</div>` : ''}

                                <div class="d-flex align-items-center justify-content-end gap-2 mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.08);">
                                    <button class="btn btn-sm btn-ghost toggle-fin-edit-btn" data-id="${f.id}" style="font-size: 0.85rem;">✏️ Bearbeiten</button>
                                    <button class="btn btn-sm btn-ghost danger-text delete-finance-btn" data-id="${f.id}" style="font-size: 0.85rem;">🗑️ Löschen</button>
                                </div>

                                <!-- INLINE EDITABLE BOX (MOBILE) -->
                                <div class="inline-edit-finance-row hidden mt-3 p-2 rounded" id="inline-fin-edit-mobile-${f.id}" style="background: rgba(0,0,0,0.5); border: 1px dashed var(--border-color);">
                                    ${this.renderEditFormHtml(f, 'mobile')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, finances);
    }

    static renderEditFormHtml(f, mode) {
        return `
            <form class="inline-fin-edit-form" data-id="${f.id}">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <strong style="color: #34d399; font-size: 0.9rem;">✏️ Buchung bearbeiten</strong>
                    <button type="button" class="btn btn-sm btn-ghost cancel-fin-edit-btn" data-id="${f.id}">✖️ Schließen</button>
                </div>

                <div class="row g-2 mb-2">
                    <div class="col-12 col-md-2">
                        <label class="form-label small mb-1">Datum</label>
                        <input type="date" class="form-control form-control-sm fin-edit-date" value="${f.date}" required />
                    </div>
                    <div class="col-12 col-md-3">
                        <label class="form-label small mb-1">Titel / Verwendungszweck *</label>
                        <input type="text" class="form-control form-control-sm fin-edit-title" value="${escapeHTML(f.title)}" required />
                    </div>
                    <div class="col-6 col-md-2">
                        <label class="form-label small mb-1">Typ</label>
                        <select class="form-select form-select-sm fin-edit-type">
                            <option value="ausgabe" ${f.type === 'ausgabe' ? 'selected' : ''}>📉 Ausgabe (-)</option>
                            <option value="einnahme" ${f.type === 'einnahme' ? 'selected' : ''}>📈 Einnahme (+)</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-2">
                        <label class="form-label small mb-1">Betrag (€)</label>
                        <input type="number" step="0.01" class="form-control form-control-sm fin-edit-amount" value="${Math.abs(f.amount)}" required />
                    </div>
                    <div class="col-12 col-md-3">
                        <label class="form-label small mb-1">Kategorie</label>
                        <input type="text" class="form-control form-control-sm fin-edit-category" value="${escapeHTML(f.category || '')}" />
                    </div>
                </div>

                <div class="row g-2 align-items-end">
                    <div class="col-12 col-md-4">
                        <label class="form-label small mb-1">Beleg-Nr.</label>
                        <input type="text" class="form-control form-control-sm fin-edit-receipt" value="${escapeHTML(f.receipt || '')}" />
                    </div>
                    <div class="col-12 col-md-5">
                        <label class="form-label small mb-1">Notizen</label>
                        <input type="text" class="form-control form-control-sm fin-edit-notes" value="${escapeHTML(f.notes || '')}" />
                    </div>
                    <div class="col-12 col-md-3 text-end">
                        <button type="submit" class="btn btn-sm btn-emerald w-100 mt-2 mt-md-0">💾 Speichern</button>
                    </div>
                </div>
            </form>
        `;
    }

    static openMetricModal(metricType, finances) {
        // Prevent background body scroll
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        const totalEinnahmen = finances.filter(f => f.type === 'einnahme').reduce((sum, f) => sum + f.amount, 0);
        const totalAusgaben = finances.filter(f => f.type === 'ausgabe').reduce((sum, f) => sum + Math.abs(f.amount), 0);
        const kassenstand = totalEinnahmen - totalAusgaben;

        let title = '';
        let icon = '';
        let badgeColor = '';
        let mainValue = '';
        let filteredItems = [];

        if (metricType === 'kassenstand') {
            title = '💰 Aktueller Kassenstand & Gesamtsaldo';
            icon = '📈';
            badgeColor = '#34d399';
            mainValue = kassenstand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
            filteredItems = [...finances];
        } else if (metricType === 'einnahmen') {
            title = '📈 Gesamte Einnahmen - Detailansicht';
            icon = '➕';
            badgeColor = '#10b981';
            mainValue = `+${totalEinnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
            filteredItems = finances.filter(f => f.type === 'einnahme');
        } else if (metricType === 'ausgaben') {
            title = '📉 Gesamte Ausgaben - Detailansicht';
            icon = '➖';
            badgeColor = '#ef4444';
            mainValue = `-${totalAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
            filteredItems = finances.filter(f => f.type === 'ausgabe');
        }

        // Category breakdown calculation
        const categoryMap = {};
        filteredItems.forEach(item => {
            const cat = item.category || 'Allgemein';
            const amt = Math.abs(item.amount);
            categoryMap[cat] = (categoryMap[cat] || 0) + amt;
        });

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 680px; width: 95vw; position: relative; box-shadow: 0 25px 60px rgba(0,0,0,0.85); border: 1px solid rgba(255,255,255,0.15);">
                <div class="modal-header d-flex align-items-center justify-content-between p-3" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="font-size: 1.25rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span>${icon}</span> ${title}
                    </h3>
                    <button class="btn btn-ghost modal-close modal-close-x" style="font-size: 1.5rem; line-height: 1; padding: 0.2rem 0.6rem;">&times;</button>
                </div>

                <div class="modal-body p-3" style="max-height: 75vh; overflow-y: auto;">
                    <!-- Key Figure Banner -->
                    <div class="p-3 mb-3 text-center rounded" style="background: rgba(0,0,0,0.4); border: 1px solid ${badgeColor}66;">
                        <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Gesamtsumme dieser Kategorie</span>
                        <span style="font-size: 2rem; font-weight: 900; color: ${badgeColor}; font-family: 'Montserrat', sans-serif;">${mainValue}</span>
                        <span style="font-size: 0.8rem; color: var(--text-dim); display: block; margin-top: 4px;">Enthält ${filteredItems.length} Buchungen</span>
                    </div>

                    <!-- Category Breakdown Chips -->
                    ${Object.keys(categoryMap).length > 0 ? `
                        <div class="mb-3">
                            <h5 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">🏷️ Aufschlüsselung nach Kategorien:</h5>
                            <div class="d-flex flex-wrap gap-2">
                                ${Object.entries(categoryMap).map(([cat, sum]) => `
                                    <div class="badge p-2" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); font-size: 0.82rem; color: #fff;">
                                        <strong>${escapeHTML(cat)}:</strong> ${sum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Detailed Items List -->
                    <h5 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">📜 Einzelpositionen (${filteredItems.length}):</h5>
                    <div class="finance-modal-list d-flex flex-column gap-2">
                        ${filteredItems.length === 0 ? `
                            <div class="p-3 text-center text-muted">Keine Positionen für diesen Filter vorhanden.</div>
                        ` : filteredItems.map(f => `
                            <div class="p-2.5 rounded d-flex align-items-center justify-content-between gap-2" 
                                 style="${f.type === 'einnahme' 
                                     ? 'background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981;' 
                                     : 'background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444;'} border-top: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
                                
                                <div>
                                    <div class="font-bold" style="color: #fff; font-size: 0.95rem;">${escapeHTML(f.title)}</div>
                                    <div style="font-size: 0.78rem; color: var(--text-muted);">
                                        📅 ${f.date} • <span class="badge badge-neutral" style="font-size: 0.7rem;">${escapeHTML(f.category || 'Allgemein')}</span>
                                        ${f.receipt ? ` • <code>${escapeHTML(f.receipt)}</code>` : ''}
                                    </div>
                                    ${f.notes ? `<div style="font-size: 0.76rem; color: #cbd5e1; font-style: italic;" class="mt-1">📝 ${escapeHTML(f.notes)}</div>` : ''}
                                </div>

                                <div class="text-end font-bold" style="font-size: 1.05rem; white-space: nowrap; color: ${f.type === 'einnahme' ? '#34d399' : '#f87171'};">
                                    ${f.type === 'einnahme' ? '+' : '-'}${Math.abs(f.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="modal-footer p-3 text-end" style="border-top: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn btn-sm btn-ghost modal-close">Schließen</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    static bindEvents(containerEl, finances) {
        // Metric Cards Popup Click Handlers
        containerEl.querySelectorAll('[data-finance-metric]').forEach(card => {
            card.addEventListener('click', (e) => {
                const metricType = e.currentTarget.dataset.financeMetric;
                this.openMetricModal(metricType, StorageEngine.getFinances());
            });
        });

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

        // Toggle Edit Row (Handles both desktop table and mobile cards)
        containerEl.querySelectorAll('.toggle-fin-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const editDesktop = containerEl.querySelector(`#inline-fin-edit-desktop-${id}`);
                const editMobile = containerEl.querySelector(`#inline-fin-edit-mobile-${id}`);
                if (editDesktop) editDesktop.classList.toggle('hidden');
                if (editMobile) editMobile.classList.toggle('hidden');
            });
        });

        // Cancel Edit Row
        containerEl.querySelectorAll('.cancel-fin-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const editDesktop = containerEl.querySelector(`#inline-fin-edit-desktop-${id}`);
                const editMobile = containerEl.querySelector(`#inline-fin-edit-mobile-${id}`);
                if (editDesktop) editDesktop.classList.add('hidden');
                if (editMobile) editMobile.classList.add('hidden');
            });
        });

        // Save Edit Row (Handles forms in both views)
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
