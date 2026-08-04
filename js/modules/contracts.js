/**
 * Contracts & Documents Vault Module (PIN Protected)
 */
import { StorageEngine } from '../storage.js';

export class ContractsModule {
    static render(containerEl) {
        const contracts = StorageEngine.getContracts();

        containerEl.innerHTML = `
            <div class="contracts-wrapper">
                <div class="section-banner contracts-banner">
                    <div class="banner-title">
                        <h2>📄 Verträge & Sponsoring-Archiv</h2>
                        <p>PIN-Geschützte Übersicht über Pachtverträge, Brauerei-Agreements, Zeltverleih und Laufzeiten.</p>
                    </div>
                </div>

                <div class="toolbar-row">
                    <h3>📑 Laufende Verträge (${contracts.length})</h3>
                    <button class="btn btn-primary btn-glow" id="add-contract-btn">➕ Neuen Vertrag anlegen</button>
                </div>

                <div class="contracts-grid">
                    ${contracts.length === 0 ? `
                        <div class="empty-column-placeholder">Keine Verträge hinterlegt.</div>
                    ` : contracts.map(c => `
                        <div class="contract-card card-glow">
                            <div class="contract-header">
                                <span class="category-badge">${c.category || 'Allgemein'}</span>
                                <span class="badge ${c.status === 'Aktiv' ? 'badge-success' : 'badge-warning'}">${c.status}</span>
                            </div>
                            <h3 class="contract-title">${c.title}</h3>
                            <p class="contract-partner">🤝 Vertragspartner: <strong>${c.partner}</strong></p>
                            <p class="contract-summary">${c.summary || ''}</p>
                            
                            <div class="contract-dates-box">
                                <div>📅 Beginn: <strong>${c.startDate}</strong></div>
                                <div>⏳ Ende/Laufzeit: <strong>${c.endDate}</strong></div>
                            </div>

                            ${c.costNotice ? `
                                <div class="contract-cost-badge">
                                    💡 ${c.costNotice}
                                </div>
                            ` : ''}

                            <div class="contract-footer">
                                <button class="btn btn-sm btn-outline delete-contract-btn" data-id="${c.id}">🗑️ Vertrag löschen</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.bindEvents(containerEl, contracts);
    }

    static bindEvents(containerEl, contracts) {
        document.getElementById('add-contract-btn')?.addEventListener('click', () => {
            this.openContractModal(containerEl);
        });

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

    static openContractModal(mainContainerEl) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        modal.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>➕ Neuen Vertrag anlegen</h3>
                    <button class="btn btn-ghost modal-close">&times;</button>
                </div>
                <form id="contract-form">
                    <div class="form-group">
                        <label>Vertragsbezeichnung *</label>
                        <input type="text" id="con-title" class="form-control" required placeholder="z. B. Brauerei-Exklusivvertrag 2026" />
                    </div>

                    <div class="form-row">
                        <div class="form-group col">
                            <label>Vertragspartner *</label>
                            <input type="text" id="con-partner" class="form-control" required placeholder="z. B. Brauerei Wieninger" />
                        </div>
                        <div class="form-group col">
                            <label>Kategorie</label>
                            <input type="text" id="con-category" class="form-control" placeholder="Getränke, Pacht, Equipment, Versicherung" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col">
                            <label>Vertragsbeginn</label>
                            <input type="date" id="con-start" class="form-control" value="${new Date().toISOString().slice(0,10)}" />
                        </div>
                        <div class="form-group col">
                            <label>Vertragsende / Laufzeit</label>
                            <input type="date" id="con-end" class="form-control" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Kosten / Sondervereinbarungen</label>
                        <input type="text" id="con-cost" class="form-control" placeholder="z. B. 1.200 € Mietgebühr / Rabatt auf Bierfässer" />
                    </div>

                    <div class="form-group">
                        <label>Zusammenfassung / Details</label>
                        <textarea id="con-summary" class="form-control" rows="3" placeholder="Wichtige Kündigungsfristen, Ansprechpartner, Telefonnummern..."></textarea>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-ghost modal-close">Abbrechen</button>
                        <button type="submit" class="btn btn-primary btn-glow">Vertrag speichern</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => modal.remove()));

        document.getElementById('contract-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const contracts = StorageEngine.getContracts();

            const title = document.getElementById('con-title').value;
            const partner = document.getElementById('con-partner').value;
            const category = document.getElementById('con-category').value;
            const startDate = document.getElementById('con-start').value;
            const endDate = document.getElementById('con-end').value;
            const costNotice = document.getElementById('con-cost').value;
            const summary = document.getElementById('con-summary').value;

            const newContract = {
                id: 'c_' + Date.now(),
                title,
                partner,
                category: category || 'Allgemein',
                startDate,
                endDate,
                costNotice,
                summary,
                status: 'Aktiv'
            };

            contracts.unshift(newContract);
            StorageEngine.saveContracts(contracts);
            modal.remove();
            this.render(mainContainerEl);
        });
    }
}
