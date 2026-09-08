/**
 * Contracts & Documents Vault Module - Clean Executive Standard (PIN Protected)
 * Modal-based creation and editing for a clean, professional cards archive layout.
 */
import { StorageEngine, escapeHTML } from '../storage.js';

export class ContractsModule {
    static render(containerEl) {
        const contracts = StorageEngine.getContracts();

        containerEl.innerHTML = `
            <div class="contracts-wrapper">
                <!-- Main Header Toolbar -->
                <div class="card-glow p-4 mb-4">
                    <div class="d-flex align-items-center justify-content-between mb-3 pb-2" style="border-bottom: 1px solid var(--border-subtle);">
                        <div>
                            <h3 class="m-0" style="color: var(--text-primary); font-weight: 800; font-size: 1.15rem;">
                                📋 Verträge & Sponsoring-Archiv (${contracts.length})
                            </h3>
                            <span style="color: var(--text-muted); font-size: 0.85rem;">Pachtverträge, Brauerei-Agreements, Zeltverleih & Laufzeiten</span>
                        </div>
                        <button class="btn btn-donezo-primary btn-sm" id="open-add-contract-modal">
                            ➕ Neuer Vertrag
                        </button>
                    </div>

                    <!-- CONTRACT CARDS GRID -->
                    <div class="contracts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem;">
                        ${contracts.length === 0 ? `
                            <div class="text-center p-4 text-muted w-100">Keine Verträge hinterlegt. Klicken Sie oben auf "+ Neuer Vertrag".</div>
                        ` : contracts.map(c => `
                            <div class="contract-card" id="contract-card-${c.id}">
                                <div class="contract-header d-flex align-items-center justify-content-between mb-2">
                                    <span class="badge badge-neutral">${escapeHTML(c.category || 'Allgemein')}</span>
                                    <span class="badge ${c.status === 'Aktiv' ? 'badge-success' : 'badge-warning'}">${c.status}</span>
                                </div>
                                
                                <h3 class="contract-title m-0 mb-1" style="font-size: 1.1rem;">${escapeHTML(c.title)}</h3>
                                <p class="contract-partner mb-2" style="font-size: 0.88rem;">🤝 Vertragspartner: <strong>${escapeHTML(c.partner)}</strong></p>
                                
                                ${c.summary ? `<p class="contract-summary mb-2 p-2 rounded" style="font-size: 0.82rem;">${escapeHTML(c.summary)}</p>` : ''}
                                
                                <div class="contract-dates-box mb-2 p-2 rounded d-flex justify-content-between" style="font-size: 0.8rem;">
                                    <div>📅 Beginn: <strong>${c.startDate || '-'}</strong></div>
                                    <div>⏳ Ende: <strong>${c.endDate || '-'}</strong></div>
                                </div>

                                ${c.costNotice ? `
                                    <div class="contract-cost-badge mb-2 p-2 rounded" style="background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.25); font-size: 0.82rem; font-weight: 700;">
                                        💡 ${escapeHTML(c.costNotice)}
                                    </div>
                                ` : ''}

                                <div class="contract-footer mt-3 pt-2 d-flex align-items-center justify-content-end gap-1" style="border-top: 1px solid var(--border-subtle);">
                                    <button class="btn btn-sm btn-ghost edit-contract-modal-btn" data-id="${c.id}">✏️ Bearbeiten</button>
                                    <button class="btn btn-sm btn-ghost danger-text delete-contract-btn" data-id="${c.id}">🗑️ Löschen</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, contracts);
    }

    /**
     * Clean Modal Dialog for Adding or Editing Contracts
     */
    static openContractModal(containerEl, contracts, editItem = null) {
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        const isEdit = !!editItem;
        const title = isEdit ? '✏️ Vertrag bearbeiten' : '➕ Neuer Vertrag anlegen';

        const selectedStatus = editItem ? (editItem.status || 'Aktiv') : 'Aktiv';

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 580px; width: 92vw; position: relative; border-radius: 16px; overflow: visible; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
                <div class="modal-header d-flex align-items-center justify-content-between p-3" style="border-bottom: 1px solid var(--border-subtle);">
                    <h3 style="font-size: 1.15rem; margin: 0; color: var(--text-primary); font-weight: 800;">${title}</h3>
                    <button class="btn btn-ghost modal-close-btn" style="font-size: 1.2rem; padding: 0.2rem 0.5rem;">&times;</button>
                </div>

                <form id="contract-modal-form">
                    <div class="modal-body p-3">
                        <div class="row g-2 mb-2.5">
                            <div class="col-12 col-md-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Vertragsbezeichnung *</label>
                                <input type="text" id="modal-con-title" class="form-control form-control-sm" placeholder="z. B. Brauerei-Exklusivvertrag 2026" value="${editItem ? escapeHTML(editItem.title) : ''}" required />
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Vertragspartner *</label>
                                <input type="text" id="modal-con-partner" class="form-control form-control-sm" placeholder="z. B. Brauerei Wieninger" value="${editItem ? escapeHTML(editItem.partner) : ''}" required />
                            </div>
                        </div>

                        <div class="row g-2 mb-2.5">
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Kategorie</label>
                                <input type="text" id="modal-con-category" class="form-control form-control-sm" placeholder="Getränke, Pacht..." value="${editItem ? escapeHTML(editItem.category || '') : ''}" />
                            </div>
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Status</label>
                                <div class="custom-inapp-dropdown" id="modal-con-status-container">
                                    <div class="custom-inapp-trigger" id="modal-con-status-trigger" style="height: 38px;">
                                        <span id="modal-con-status-display" style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                                            ${selectedStatus === 'Auslaufend' ? '🟡 Auslaufend' : (selectedStatus === 'Beendet' ? '🔴 Beendet' : '🟢 Aktiv')}
                                        </span>
                                        <span class="custom-inapp-caret">▾</span>
                                    </div>
                                    <div class="custom-inapp-menu hidden" id="modal-con-status-menu">
                                        <div class="custom-inapp-item ${selectedStatus === 'Aktiv' ? 'active' : ''}" data-val="Aktiv">
                                            <span>🟢 Aktiv</span>
                                            ${selectedStatus === 'Aktiv' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                        </div>
                                        <div class="custom-inapp-item ${selectedStatus === 'Auslaufend' ? 'active' : ''}" data-val="Auslaufend">
                                            <span>🟡 Auslaufend</span>
                                            ${selectedStatus === 'Auslaufend' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                        </div>
                                        <div class="custom-inapp-item ${selectedStatus === 'Beendet' ? 'active' : ''}" data-val="Beendet">
                                            <span>🔴 Beendet</span>
                                            ${selectedStatus === 'Beendet' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                        </div>
                                    </div>
                                    <input type="hidden" id="modal-con-status" value="${selectedStatus}" />
                                </div>
                            </div>
                        </div>

                        <div class="row g-2 mb-2.5">
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Vertragsbeginn</label>
                                <input type="date" id="modal-con-start" class="form-control form-control-sm" value="${editItem ? editItem.startDate : new Date().toISOString().slice(0,10)}" />
                            </div>
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Vertragsende / Laufzeit</label>
                                <input type="date" id="modal-con-end" class="form-control form-control-sm" value="${editItem ? editItem.endDate || '' : ''}" />
                            </div>
                        </div>

                        <div class="mb-2.5">
                            <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Kosten / Sondervereinbarungen</label>
                            <input type="text" id="modal-con-cost" class="form-control form-control-sm" placeholder="z. B. 1.200 € Mietgebühr / Rabatt" value="${editItem ? escapeHTML(editItem.costNotice || '') : ''}" />
                        </div>

                        <div class="mb-2">
                            <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Details & Zusammenfassung</label>
                            <textarea id="modal-con-summary" class="form-control form-control-sm" rows="3" placeholder="Kündigungsfristen, Ansprechpartner, Notizen...">${editItem ? escapeHTML(editItem.summary || '') : ''}</textarea>
                        </div>
                    </div>

                    <div class="modal-footer p-3 d-flex justify-content-end gap-2" style="border-top: 1px solid var(--border-subtle); border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                        <button type="button" class="btn btn-sm btn-ghost modal-close-btn">Abbrechen</button>
                        <button type="submit" class="btn btn-sm btn-donezo-primary font-bold">
                            ${isEdit ? '💾 Speichern' : '➕ Vertrag anlegen'}
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

        // Custom status dropdown logic
        const statusTrigger = modal.querySelector('#modal-con-status-trigger');
        const statusMenu = modal.querySelector('#modal-con-status-menu');
        const statusHidden = modal.querySelector('#modal-con-status');
        const statusDisplay = modal.querySelector('#modal-con-status-display');

        if (statusTrigger && statusMenu) {
            statusTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = statusMenu.classList.contains('hidden');
                statusMenu.classList.toggle('hidden', !isHidden);
                statusTrigger.classList.toggle('active', isHidden);
            });

            statusMenu.querySelectorAll('.custom-inapp-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = item.dataset.val;
                    statusHidden.value = val;
                    const labels = {
                        'Aktiv': '🟢 Aktiv',
                        'Auslaufend': '🟡 Auslaufend',
                        'Beendet': '🔴 Beendet'
                    };
                    statusDisplay.textContent = labels[val] || val;
                    statusMenu.querySelectorAll('.custom-inapp-item').forEach(i => {
                        i.classList.remove('active');
                        const chk = i.querySelector('span:last-child');
                        if (chk && chk.textContent === '✓') chk.remove();
                    });
                    item.classList.add('active');
                    item.insertAdjacentHTML('beforeend', '<span style="color: #10b981; font-weight: 800;">✓</span>');
                    statusMenu.classList.add('hidden');
                    statusTrigger.classList.remove('active');
                });
            });

            modal.addEventListener('click', (e) => {
                if (!e.target.closest('#modal-con-status-container')) {
                    statusMenu.classList.add('hidden');
                    statusTrigger.classList.remove('active');
                }
            });
        }

        modal.querySelector('#contract-modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const titleVal = document.getElementById('modal-con-title').value.trim();
            const partnerVal = document.getElementById('modal-con-partner').value.trim();
            const categoryVal = document.getElementById('modal-con-category').value.trim() || 'Allgemein';
            const statusVal = document.getElementById('modal-con-status').value;
            const startDateVal = document.getElementById('modal-con-start').value;
            const endDateVal = document.getElementById('modal-con-end').value;
            const costNoticeVal = document.getElementById('modal-con-cost').value.trim();
            const summaryVal = document.getElementById('modal-con-summary').value.trim();

            if (!titleVal || !partnerVal) return;

            const currentContracts = StorageEngine.getContracts();

            if (isEdit) {
                const idx = currentContracts.findIndex(c => c.id === editItem.id);
                if (idx !== -1) {
                    currentContracts[idx] = {
                        ...currentContracts[idx],
                        title: titleVal,
                        partner: partnerVal,
                        category: categoryVal,
                        status: statusVal,
                        startDate: startDateVal,
                        endDate: endDateVal,
                        costNotice: costNoticeVal,
                        summary: summaryVal
                    };
                }
            } else {
                currentContracts.unshift({
                    id: 'c_' + Date.now(),
                    title: titleVal,
                    partner: partnerVal,
                    category: categoryVal,
                    status: statusVal,
                    startDate: startDateVal,
                    endDate: endDateVal,
                    costNotice: costNoticeVal,
                    summary: summaryVal
                });
            }

            StorageEngine.saveContracts(currentContracts);
            closeModal();
            this.render(containerEl);
        });
    }

    static bindEvents(containerEl, contracts) {
        // Open Add Modal
        containerEl.querySelector('#open-add-contract-modal')?.addEventListener('click', () => {
            this.openContractModal(containerEl, contracts, null);
        });

        // Open Edit Modal
        containerEl.querySelectorAll('.edit-contract-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const item = contracts.find(c => c.id === id);
                if (item) {
                    this.openContractModal(containerEl, contracts, item);
                }
            });
        });

        // Delete contract
        containerEl.querySelectorAll('.delete-contract-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Vertrag wirklich aus dem Archiv löschen?')) {
                    const updated = contracts.filter(c => c.id !== id);
                    StorageEngine.saveContracts(updated);
                    this.render(containerEl);
                }
            });
        });
    }
}
