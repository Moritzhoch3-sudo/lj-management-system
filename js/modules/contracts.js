/**
 * Contracts & Documents Vault Module - Direct In-Box Creation & Card Editing (PIN Protected)
 */
import { StorageEngine } from '../storage.js';

export class ContractsModule {
    static render(containerEl) {
        const contracts = StorageEngine.getContracts();

        containerEl.innerHTML = `
            <div class="contracts-wrapper">
                <div class="section-banner contracts-banner">
                    <div class="banner-title">
                        <h2>📋 Verträge & Sponsoring-Archiv</h2>
                        <p>PIN-Geschützte Übersicht über Pachtverträge, Brauerei-Agreements, Zeltverleih und Laufzeiten.</p>
                    </div>
                </div>

                <!-- DIRECT INLINE CONTRACT CREATION BOX -->
                <div class="card-glow mb-4">
                    <div class="toolbar-row mb-3">
                        <h3>📋 Laufende Verträge (${contracts.length})</h3>
                        <button class="btn btn-primary btn-sm" id="toggle-add-contract-box">➕ Neuen Vertrag direkt anlegen</button>
                    </div>

                    <!-- COLLAPSIBLE INLINE ADD FORM -->
                    <div class="card-inline-add-bar p-3 mb-3 hidden" id="inline-contract-add-box" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px;">
                        <h4 class="mb-2" style="font-size: 0.95rem; color: #34d399;">➕ Neuen Vertrag direkt hier im Archiv erfassen:</h4>
                        <form id="inline-contract-add-form">
                            <div class="row g-2 mb-2">
                                <div class="col-md-6">
                                    <label class="form-label small mb-1">Vertragsbezeichnung *</label>
                                    <input type="text" id="add-con-title" class="form-control form-control-sm" placeholder="z. B. Brauerei-Exklusivvertrag 2026" required />
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-1">Vertragspartner *</label>
                                    <input type="text" id="add-con-partner" class="form-control form-control-sm" placeholder="z. B. Brauerei Wieninger" required />
                                </div>
                            </div>
                            <div class="row g-2 mb-2">
                                <div class="col-md-3">
                                    <label class="form-label small mb-1">Kategorie</label>
                                    <input type="text" id="add-con-category" class="form-control form-control-sm" placeholder="Getränke, Pacht, Equipment..." />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small mb-1">Status</label>
                                    <select id="add-con-status" class="form-select form-select-sm">
                                        <option value="Aktiv" selected>🟢 Aktiv</option>
                                        <option value="Auslaufend">🟡 Auslaufend</option>
                                        <option value="Beendet">🔴 Beendet</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small mb-1">Vertragsbeginn</label>
                                    <input type="date" id="add-con-start" class="form-control form-control-sm" value="${new Date().toISOString().slice(0,10)}" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small mb-1">Vertragsende / Laufzeit</label>
                                    <input type="date" id="add-con-end" class="form-control form-control-sm" />
                                </div>
                            </div>
                            <div class="row g-2 mb-2">
                                <div class="col-md-6">
                                    <label class="form-label small mb-1">Kosten / Sondervereinbarungen</label>
                                    <input type="text" id="add-con-cost" class="form-control form-control-sm" placeholder="z. B. 1.200 € Mietgebühr / Rabatt" />
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-1">Details & Zusammenfassung</label>
                                    <input type="text" id="add-con-summary" class="form-control form-control-sm" placeholder="Kündigungsfristen, Kontakte..." />
                                </div>
                            </div>
                            <div class="d-flex justify-content-end gap-2 mt-2">
                                <button type="button" class="btn btn-sm btn-ghost" id="cancel-add-contract-btn">Abbrechen</button>
                                <button type="submit" class="btn btn-sm btn-emerald">➕ Vertrag Speichern</button>
                            </div>
                        </form>
                    </div>

                    <!-- CONTRACT CARDS GRID WITH INLINE EDITING -->
                    <div class="contracts-grid">
                        ${contracts.length === 0 ? `
                            <div class="empty-column-placeholder">Keine Verträge hinterlegt. Klicken Sie oben, um einen Vertrag hinzuzufügen.</div>
                        ` : contracts.map(c => `
                            <div class="contract-card card-glow" id="contract-card-${c.id}">
                                <div class="contract-header">
                                    <span class="category-badge">${c.category || 'Allgemein'}</span>
                                    <span class="badge ${c.status === 'Aktiv' ? 'badge-success' : 'badge-warning'}">${c.status}</span>
                                </div>
                                <h3 class="contract-title">${c.title}</h3>
                                <p class="contract-partner">🤝 Vertragspartner: <strong>${c.partner}</strong></p>
                                <p class="contract-summary">${c.summary || ''}</p>
                                
                                <div class="contract-dates-box mb-2">
                                    <div>📅 Beginn: <strong>${c.startDate || '-'}</strong></div>
                                    <div>⏳ Ende: <strong>${c.endDate || '-'}</strong></div>
                                </div>

                                ${c.costNotice ? `
                                    <div class="contract-cost-badge mb-2">
                                        💡 ${c.costNotice}
                                    </div>
                                ` : ''}

                                <div class="contract-footer mt-3">
                                    <button class="btn btn-sm btn-ghost toggle-con-edit-btn" data-id="${c.id}">✏️ Bearbeiten</button>
                                    <button class="btn btn-sm btn-outline danger-text delete-contract-btn" data-id="${c.id}">🗑️ Löschen</button>
                                </div>

                                <!-- INLINE EDIT FORM INSIDE CARD -->
                                <form class="inline-con-edit-form p-2 mt-2 hidden" id="inline-con-edit-${c.id}" data-id="${c.id}" style="background: rgba(0,0,0,0.5); border-radius: 6px; border: 1px dashed var(--border-color);">
                                    <strong style="color: #34d399; font-size: 0.85rem;" class="d-block mb-1">✏️ Vertrag vor Ort bearbeiten</strong>
                                    <input type="text" class="form-control form-control-sm mb-1 edit-con-title" value="${c.title}" required placeholder="Titel" />
                                    <input type="text" class="form-control form-control-sm mb-1 edit-con-partner" value="${c.partner}" required placeholder="Partner" />
                                    <input type="text" class="form-control form-control-sm mb-1 edit-con-category" value="${c.category || ''}" placeholder="Kategorie" />
                                    
                                    <div class="d-flex gap-1 mb-1">
                                        <select class="form-select form-select-sm edit-con-status">
                                            <option value="Aktiv" ${c.status === 'Aktiv' ? 'selected' : ''}>Aktiv</option>
                                            <option value="Auslaufend" ${c.status === 'Auslaufend' ? 'selected' : ''}>Auslaufend</option>
                                            <option value="Beendet" ${c.status === 'Beendet' ? 'selected' : ''}>Beendet</option>
                                        </select>
                                        <input type="date" class="form-control form-control-sm edit-con-start" value="${c.startDate || ''}" />
                                        <input type="date" class="form-control form-control-sm edit-con-end" value="${c.endDate || ''}" />
                                    </div>
                                    
                                    <input type="text" class="form-control form-control-sm mb-1 edit-con-cost" value="${c.costNotice || ''}" placeholder="Kosten/Hinweis" />
                                    <textarea class="form-control form-control-sm mb-2 edit-con-summary" rows="2" placeholder="Details...">${c.summary || ''}</textarea>
                                    
                                    <div class="d-flex justify-content-end gap-1">
                                        <button type="button" class="btn btn-sm btn-ghost cancel-con-edit-btn" data-id="${c.id}">Abbrechen</button>
                                        <button type="submit" class="btn btn-sm btn-emerald">💾 Speichern</button>
                                    </div>
                                </form>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, contracts);
    }

    static bindEvents(containerEl, contracts) {
        // Toggle inline add box
        const addBox = document.getElementById('inline-contract-add-box');
        document.getElementById('toggle-add-contract-box')?.addEventListener('click', () => {
            addBox?.classList.toggle('hidden');
        });
        document.getElementById('cancel-add-contract-btn')?.addEventListener('click', () => {
            addBox?.classList.add('hidden');
        });

        // Save new contract inline
        document.getElementById('inline-contract-add-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('add-con-title').value.trim();
            const partner = document.getElementById('add-con-partner').value.trim();
            const category = document.getElementById('add-con-category').value.trim() || 'Allgemein';
            const status = document.getElementById('add-con-status').value;
            const startDate = document.getElementById('add-con-start').value;
            const endDate = document.getElementById('add-con-end').value;
            const costNotice = document.getElementById('add-con-cost').value.trim();
            const summary = document.getElementById('add-con-summary').value.trim();

            if (!title || !partner) return;

            const currentContracts = StorageEngine.getContracts();
            currentContracts.unshift({
                id: 'c_' + Date.now(),
                title,
                partner,
                category,
                status,
                startDate,
                endDate,
                costNotice,
                summary
            });

            StorageEngine.saveContracts(currentContracts);
            this.render(containerEl);
        });

        // Toggle card inline edit form
        containerEl.querySelectorAll('.toggle-con-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const form = containerEl.querySelector(`#inline-con-edit-${id}`);
                if (form) form.classList.toggle('hidden');
            });
        });

        // Cancel card inline edit
        containerEl.querySelectorAll('.cancel-con-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const form = containerEl.querySelector(`#inline-con-edit-${id}`);
                if (form) form.classList.add('hidden');
            });
        });

        // Save card inline edit
        containerEl.querySelectorAll('.inline-con-edit-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = form.dataset.id;
                const currentContracts = StorageEngine.getContracts();
                const idx = currentContracts.findIndex(c => c.id === id);

                if (idx !== -1) {
                    const title = form.querySelector('.edit-con-title').value.trim();
                    const partner = form.querySelector('.edit-con-partner').value.trim();
                    const category = form.querySelector('.edit-con-category').value.trim() || 'Allgemein';
                    const status = form.querySelector('.edit-con-status').value;
                    const startDate = form.querySelector('.edit-con-start').value;
                    const endDate = form.querySelector('.edit-con-end').value;
                    const costNotice = form.querySelector('.edit-con-cost').value.trim();
                    const summary = form.querySelector('.edit-con-summary').value.trim();

                    if (!title || !partner) return;

                    currentContracts[idx] = {
                        ...currentContracts[idx],
                        title,
                        partner,
                        category,
                        status,
                        startDate,
                        endDate,
                        costNotice,
                        summary
                    };

                    StorageEngine.saveContracts(currentContracts);
                    this.render(containerEl);
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
