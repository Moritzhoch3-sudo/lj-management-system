/**
 * Finance & Cashbook Module - Clean Executive Standard (PIN Protected)
 * Modal-based creation and editing to keep the page 100% clean and uncluttered.
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
                <!-- Financial Summary Metrics (Donezo 3-Card Row) -->
                <div class="donezo-stats-row mb-4" style="grid-template-columns: repeat(3, 1fr);">
                    <div class="donezo-stat-hero" data-finance-metric="kassenstand" title="Kassenstand-Details öffnen" style="cursor: pointer;">
                        <div class="stat-top">
                            <span class="stat-label">Aktueller Kassenstand</span>
                            <span class="donezo-arrow-badge">📈</span>
                        </div>
                        <div class="stat-number">${kassenstand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        <div class="stat-pill">🔍 Details anzeigen</div>
                    </div>

                    <div class="donezo-stat-card" data-finance-metric="einnahmen" title="Einnahmen öffnen" style="cursor: pointer;">
                        <div class="stat-top">
                            <span class="stat-label">Gesamte Einnahmen</span>
                            <span class="donezo-arrow-badge">➕</span>
                        </div>
                        <div class="stat-number" style="color: #10b981;">+${totalEinnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        <div class="stat-pill">🔍 Aufschlüsselung</div>
                    </div>

                    <div class="donezo-stat-card" data-finance-metric="ausgaben" title="Ausgaben öffnen" style="cursor: pointer;">
                        <div class="stat-top">
                            <span class="stat-label">Gesamte Ausgaben</span>
                            <span class="donezo-arrow-badge">➖</span>
                        </div>
                        <div class="stat-number" style="color: #ef4444;">-${totalAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        <div class="stat-pill">🔍 Aufschlüsselung</div>
                    </div>
                </div>

                <!-- Main Transactions Journal Box -->
                <div class="card-glow p-4">
                    <div class="d-flex align-items-center justify-content-between mb-3 pb-2" style="border-bottom: 1px solid var(--border-subtle);">
                        <h3 class="m-0" style="color: var(--text-primary); font-weight: 800; font-size: 1.15rem;">
                            📜 Transaktions-Journal (${finances.length} Einträge)
                        </h3>
                        <button class="btn btn-donezo-primary btn-sm" id="open-add-finance-modal">
                            ➕ Neue Buchung
                        </button>
                    </div>

                    <!-- DESKTOP TABLE VIEW -->
                    <div class="table-responsive finance-desktop-table">
                        <table class="clean-tasks-table w-100">
                            <thead>
                                <tr>
                                    <th style="width: 110px;">Datum</th>
                                    <th>Verwendungszweck & Notiz</th>
                                    <th style="width: 140px;">Kategorie</th>
                                    <th style="width: 130px;">Beleg-Nr.</th>
                                    <th style="width: 110px;">Typ</th>
                                    <th style="width: 120px;">Betrag</th>
                                    <th style="width: 120px; text-align: right;">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${finances.length === 0 ? `
                                    <tr><td colspan="7" class="text-center p-4 text-muted">Keine Buchungen vorhanden. Klicken Sie oben auf "+ Neue Buchung".</td></tr>
                                ` : finances.map(f => `
                                    <tr class="finance-row">
                                        <td style="color: var(--text-muted); font-weight: 600;">${f.date}</td>
                                        <td>
                                            <strong style="color: var(--text-primary); font-size: 0.92rem;">${escapeHTML(f.title)}</strong>
                                            ${f.notes ? `<br><small style="color: var(--text-muted);">${escapeHTML(f.notes)}</small>` : ''}
                                        </td>
                                        <td><span class="badge badge-neutral">${escapeHTML(f.category || 'Allgemein')}</span></td>
                                        <td><code style="background: var(--bg-canvas); padding: 0.15rem 0.4rem; border-radius: 6px; border: 1px solid var(--border-subtle);">${escapeHTML(f.receipt || '-')}</code></td>
                                        <td>
                                            <span class="badge ${f.type === 'einnahme' ? 'badge-success' : 'badge-danger'}">
                                                ${f.type === 'einnahme' ? 'Einnahme' : 'Ausgabe'}
                                            </span>
                                        </td>
                                        <td class="${f.type === 'einnahme' ? 'text-success font-bold' : 'text-danger font-bold'}">
                                            ${f.type === 'einnahme' ? '+' : '-'}${Math.abs(f.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td style="text-align: right;">
                                            <div class="table-action-btns d-flex align-items-center justify-content-end gap-1">
                                                <button class="btn btn-sm btn-ghost edit-finance-modal-btn" data-id="${f.id}" title="Bearbeiten">✏️ Edit</button>
                                                <button class="btn btn-sm btn-ghost danger-text delete-finance-btn" data-id="${f.id}" title="Löschen">🗑️</button>
                                            </div>
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

    /**
     * Clean Modal Dialog for Creating or Editing Transactions
     */
    static openTransactionModal(containerEl, finances, editItem = null) {
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        const isEdit = !!editItem;
        const title = isEdit ? '✏️ Buchung bearbeiten' : '➕ Neue Buchung erfassen';
        const defaultDate = editItem ? editItem.date : new Date().toISOString().slice(0, 10);

        const availableCategories = StorageEngine.getCategories();
        const selectedType = editItem ? editItem.type : 'ausgabe';
        const initialCatName = editItem ? (editItem.category || 'Allgemein') : (availableCategories[0]?.name || 'Sonstiges');
        const selectedCatObj = availableCategories.find(c => c.name === initialCatName || c.id === initialCatName) || availableCategories[0] || { name: 'Sonstiges', icon: '📋' };

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 580px; width: 92vw; border-radius: 16px; overflow: visible; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
                <div class="modal-header d-flex align-items-center justify-content-between p-3.5" style="border-bottom: 1px solid var(--border-subtle);">
                    <div class="d-flex align-items-center gap-2">
                        <span style="font-size: 1.25rem;">💰</span>
                        <h3 style="font-size: 1.15rem; margin: 0; color: var(--text-primary); font-weight: 800;">${title}</h3>
                    </div>
                    <button class="btn btn-ghost modal-close-btn" style="font-size: 1.2rem; padding: 0.2rem 0.5rem; border-radius: 8px;">&times;</button>
                </div>

                <form id="finance-modal-form">
                    <div class="modal-body p-4 d-flex flex-column gap-3">
                        <!-- Row 1: Datum & Typ (2 gleich große Kästchen mit Typ-Buttons nebeneinander) -->
                        <div class="row g-3">
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">📅 Datum *</label>
                                <input type="date" id="modal-fin-date" class="form-control" value="${defaultDate}" required style="height: 42px; border-radius: 10px;" />
                            </div>
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">📊 Typ auswählen *</label>
                                <div class="d-flex gap-2" id="modal-fin-type-group" style="height: 42px;">
                                    <button type="button" class="fin-type-toggle-btn ${selectedType === 'ausgabe' ? 'active-ausgabe' : ''}" data-type="ausgabe" style="flex: 1; height: 100%; font-size: 0.88rem;">
                                        📉 Ausgabe (-)
                                    </button>
                                    <button type="button" class="fin-type-toggle-btn ${selectedType === 'einnahme' ? 'active-einnahme' : ''}" data-type="einnahme" style="flex: 1; height: 100%; font-size: 0.88rem;">
                                        📈 Einnahme (+)
                                    </button>
                                </div>
                                <input type="hidden" id="modal-fin-type" value="${selectedType}" />
                            </div>
                        </div>

                        <!-- Row 2: Betrag & Kategorie-Auswahl (2 gleich große Kästchen mit In-App Dropdown) -->
                        <div class="row g-3">
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">💶 Betrag in Euro (€) *</label>
                                <input type="number" step="0.01" id="modal-fin-amount" class="form-control" placeholder="0.00" value="${editItem ? Math.abs(editItem.amount) : ''}" required style="height: 42px; border-radius: 10px; font-weight: 700;" />
                            </div>
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">🏷️ Kategorie auswählen *</label>
                                <div class="custom-inapp-dropdown" id="modal-fin-cat-container">
                                    <div class="custom-inapp-trigger" id="modal-fin-cat-trigger">
                                        <span id="modal-fin-cat-display" style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">
                                            <span>${selectedCatObj.icon ? selectedCatObj.icon : '📋'}</span>
                                            <span>${escapeHTML(selectedCatObj.name)}</span>
                                        </span>
                                        <span class="custom-inapp-caret">▾</span>
                                    </div>
                                    <div class="custom-inapp-menu hidden" id="modal-fin-cat-menu">
                                        ${availableCategories.map(c => `
                                            <div class="custom-inapp-item ${c.name === selectedCatObj.name ? 'active' : ''}" data-cat-name="${escapeHTML(c.name)}" data-cat-icon="${escapeHTML(c.icon || '📋')}">
                                                <span style="display: flex; align-items: center; gap: 0.45rem;">
                                                    <span>${c.icon ? c.icon : '📋'}</span>
                                                    <span>${escapeHTML(c.name)}</span>
                                                </span>
                                                ${c.name === selectedCatObj.name ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                    <input type="hidden" id="modal-fin-category" value="${escapeHTML(selectedCatObj.name)}" />
                                </div>
                            </div>
                        </div>

                        <!-- Row 3: Titel & Beleg-Nr (2 gleich große Kästchen) -->
                        <div class="row g-3">
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">📝 Verwendungszweck / Titel *</label>
                                <input type="text" id="modal-fin-title" class="form-control" placeholder="z. B. Getränkeeinkauf Brauerei" value="${editItem ? escapeHTML(editItem.title) : ''}" required style="height: 42px; border-radius: 10px;" />
                            </div>
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">🧾 Beleg-Nr. / Quittung</label>
                                <input type="text" id="modal-fin-receipt" class="form-control" placeholder="z. B. BELEG-2026-001" value="${editItem ? escapeHTML(editItem.receipt || '') : ''}" style="height: 42px; border-radius: 10px;" />
                            </div>
                        </div>

                        <!-- Row 4: Notizen & Anmerkungen (Vollbreite, sauber bündig) -->
                        <div>
                            <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">💬 Notizen / Anmerkungen</label>
                            <textarea id="modal-fin-notes" class="form-control" rows="3" placeholder="Zusätzliche Infos oder Details zur Buchung..." style="border-radius: 10px; width: 100%;">${editItem ? escapeHTML(editItem.notes || '') : ''}</textarea>
                        </div>
                    </div>

                    <div class="modal-footer p-3.5 d-flex justify-content-end gap-2" style="border-top: 1px solid var(--border-subtle); background: #f8fafc; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                        <button type="button" class="btn btn-sm btn-ghost modal-close-btn" style="padding: 0.5rem 1.15rem; font-weight: 600;">Abbrechen</button>
                        <button type="submit" class="btn btn-sm btn-donezo-primary font-bold" style="padding: 0.5rem 1.35rem; border-radius: 10px;">
                            ${isEdit ? '💾 Speichern' : '➕ Buchung anlegen'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.querySelectorAll('.modal-close-btn').forEach(b => b.addEventListener('click', closeModal));

        // Segmented Type Buttons logic
        const typeHiddenInput = modal.querySelector('#modal-fin-type');
        const typeButtons = modal.querySelectorAll('.fin-type-toggle-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                typeHiddenInput.value = type;
                typeButtons.forEach(b => {
                    b.classList.remove('active-ausgabe', 'active-einnahme');
                });
                if (type === 'ausgabe') {
                    btn.classList.add('active-ausgabe');
                } else {
                    btn.classList.add('active-einnahme');
                }
            });
        });

        // In-App Custom Category Dropdown logic
        const catTrigger = modal.querySelector('#modal-fin-cat-trigger');
        const catMenu = modal.querySelector('#modal-fin-cat-menu');
        const catHiddenInput = modal.querySelector('#modal-fin-category');
        const catDisplay = modal.querySelector('#modal-fin-cat-display');

        if (catTrigger && catMenu) {
            catTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = catMenu.classList.contains('hidden');
                catMenu.classList.toggle('hidden', !isHidden);
                catTrigger.classList.toggle('active', isHidden);
            });

            catMenu.querySelectorAll('.custom-inapp-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const catName = item.dataset.catName;
                    const catIcon = item.dataset.catIcon;
                    catHiddenInput.value = catName;
                    catDisplay.innerHTML = `<span>${catIcon}</span><span>${escapeHTML(catName)}</span>`;
                    catMenu.querySelectorAll('.custom-inapp-item').forEach(i => {
                        i.classList.remove('active');
                        const chk = i.querySelector('span:last-child');
                        if (chk && chk.textContent === '✓') chk.remove();
                    });
                    item.classList.add('active');
                    item.insertAdjacentHTML('beforeend', '<span style="color: #10b981; font-weight: 800;">✓</span>');
                    catMenu.classList.add('hidden');
                    catTrigger.classList.remove('active');
                });
            });

            modal.addEventListener('click', (e) => {
                if (!e.target.closest('#modal-fin-cat-container')) {
                    catMenu.classList.add('hidden');
                    catTrigger.classList.remove('active');
                }
            });
        }

        modal.querySelector('#finance-modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('modal-fin-date').value;
            const type = document.getElementById('modal-fin-type').value;
            const titleVal = document.getElementById('modal-fin-title').value.trim();
            const amountVal = parseFloat(document.getElementById('modal-fin-amount').value);
            const categoryVal = document.getElementById('modal-fin-category').value.trim();
            const receiptVal = document.getElementById('modal-fin-receipt').value.trim();
            const notesVal = document.getElementById('modal-fin-notes').value.trim();

            if (!titleVal || isNaN(amountVal)) return;

            const currentFinances = StorageEngine.getFinances();

            if (isEdit) {
                const idx = currentFinances.findIndex(f => f.id === editItem.id);
                if (idx !== -1) {
                    currentFinances[idx] = {
                        ...currentFinances[idx],
                        date,
                        type,
                        title: titleVal,
                        amount: amountVal,
                        category: categoryVal,
                        receipt: receiptVal,
                        notes: notesVal
                    };
                }
            } else {
                currentFinances.unshift({
                    id: 'f_' + Date.now(),
                    date,
                    type,
                    title: titleVal,
                    amount: amountVal,
                    category: categoryVal,
                    receipt: receiptVal,
                    notes: notesVal
                });
            }

            StorageEngine.saveFinances(currentFinances);
            closeModal();
            this.render(containerEl);
        });
    }

    static openMetricModal(metricType, finances) {
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        let title = 'Kassenstand';
        let icon = '📈';
        let badgeColor = '#10b981';
        let filteredItems = finances;
        let totalVal = 0;

        if (metricType === 'einnahmen') {
            title = 'Gesamte Einnahmen';
            icon = '➕';
            badgeColor = '#10b981';
            filteredItems = finances.filter(f => f.type === 'einnahme');
            totalVal = filteredItems.reduce((sum, f) => sum + f.amount, 0);
        } else if (metricType === 'ausgaben') {
            title = 'Gesamte Ausgaben';
            icon = '➖';
            badgeColor = '#ef4444';
            filteredItems = finances.filter(f => f.type === 'ausgabe');
            totalVal = filteredItems.reduce((sum, f) => sum + Math.abs(f.amount), 0);
        } else {
            const einnahmen = finances.filter(f => f.type === 'einnahme').reduce((sum, f) => sum + f.amount, 0);
            const ausgaben = finances.filter(f => f.type === 'ausgabe').reduce((sum, f) => sum + Math.abs(f.amount), 0);
            totalVal = einnahmen - ausgaben;
            badgeColor = totalVal >= 0 ? '#10b981' : '#ef4444';
        }

        const mainValue = (totalVal >= 0 ? '+' : '') + totalVal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

        const categoryMap = {};
        filteredItems.forEach(f => {
            const cat = f.category || 'Allgemein';
            const amt = Math.abs(f.amount);
            categoryMap[cat] = (categoryMap[cat] || 0) + amt;
        });

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 680px; width: 95vw; position: relative;">
                <div class="modal-header d-flex align-items-center justify-content-between p-3" style="border-bottom: 1px solid var(--border-subtle);">
                    <h3 style="font-size: 1.15rem; margin: 0; color: var(--text-primary); font-weight: 800;">
                        <span>${icon}</span> ${title}
                    </h3>
                    <button class="btn btn-ghost modal-close-btn" style="font-size: 1.2rem; padding: 0.2rem 0.5rem;">&times;</button>
                </div>

                <div class="modal-body p-3" style="max-height: 70vh; overflow-y: auto;">
                    <div class="p-3 mb-3 text-center rounded" style="background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 12px;">
                        <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Gesamtsumme dieser Kategorie</span>
                        <span style="font-size: 1.8rem; font-weight: 900; color: ${badgeColor};">${mainValue}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 2px;">Enthält ${filteredItems.length} Buchungen</span>
                    </div>

                    ${Object.keys(categoryMap).length > 0 ? `
                        <div class="mb-3">
                            <h5 style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 800;">🏷️ Aufschlüsselung nach Kategorien:</h5>
                            <div class="d-flex flex-wrap gap-2">
                                ${Object.entries(categoryMap).map(([cat, sum]) => `
                                    <div class="badge badge-neutral p-2" style="font-size: 0.82rem;">
                                        <strong>${escapeHTML(cat)}:</strong> ${sum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <h5 style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 800;">📜 Einzelpositionen (${filteredItems.length}):</h5>
                    <div class="d-flex flex-column gap-2">
                        ${filteredItems.length === 0 ? `
                            <div class="p-3 text-center text-muted">Keine Positionen für diesen Filter vorhanden.</div>
                        ` : filteredItems.map(f => `
                            <div class="p-2.5 rounded d-flex align-items-center justify-content-between gap-2" 
                                 style="${f.type === 'einnahme' 
                                     ? 'background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981;' 
                                     : 'background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444;'} border-radius: 8px; border-top: 1px solid var(--border-subtle);">
                                
                                <div>
                                    <div class="font-bold" style="color: var(--text-primary); font-size: 0.92rem;">${escapeHTML(f.title)}</div>
                                    <div style="font-size: 0.78rem; color: var(--text-muted);">
                                        📅 ${f.date} • <span class="badge badge-neutral" style="font-size: 0.7rem;">${escapeHTML(f.category || 'Allgemein')}</span>
                                        ${f.receipt ? ` • <code>${escapeHTML(f.receipt)}</code>` : ''}
                                    </div>
                                </div>

                                <div class="text-end font-bold" style="font-size: 1rem; white-space: nowrap; color: ${f.type === 'einnahme' ? '#10b981' : '#ef4444'};">
                                    ${f.type === 'einnahme' ? '+' : '-'}${Math.abs(f.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="modal-footer p-3 text-end" style="border-top: 1px solid var(--border-subtle);">
                    <button class="btn btn-sm btn-ghost modal-close-btn">Schließen</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.modal-close-btn').forEach(b => b.addEventListener('click', closeModal));
    }

    static bindEvents(containerEl, finances) {
        // Open Add Modal
        containerEl.querySelector('#open-add-finance-modal')?.addEventListener('click', () => {
            this.openTransactionModal(containerEl, finances, null);
        });

        // Open Edit Modal
        containerEl.querySelectorAll('.edit-finance-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const item = finances.find(f => f.id === id);
                if (item) {
                    this.openTransactionModal(containerEl, finances, item);
                }
            });
        });

        // Click metric cards for popup
        containerEl.querySelectorAll('[data-finance-metric]').forEach(card => {
            card.addEventListener('click', (e) => {
                const metricType = e.currentTarget.dataset.financeMetric;
                this.openMetricModal(metricType, StorageEngine.getFinances());
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
