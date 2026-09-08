/**
 * Landjugend Scheuring - Vorstandsverwaltung
 * PDF Report & Overview Generator
 */

import { StorageEngine } from '../storage.js';

export class PdfReportModule {
    static openPdfOverview() {
        const tasks = StorageEngine.getTasks();
        const members = StorageEngine.getMembers();
        const categories = StorageEngine.getCategories();
        const finances = StorageEngine.getFinances();
        const contracts = StorageEngine.getContracts();
        const currentUserId = StorageEngine.getCurrentUserId();
        const currentMember = members.find(m => m.id === currentUserId) || members[0] || { name: 'Vorstandschaft', role: 'Vorstand' };

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'erledigt');
        const inProgressTasks = tasks.filter(t => t.status === 'in_bearbeitung');
        const openTasks = tasks.filter(t => t.status === 'offen');
        const percent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find urgent tasks (not completed and due in <= 3 days or overdue)
        const urgentTasks = tasks.filter(t => {
            if (t.status === 'erledigt') return false;
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            return diffDays <= 3;
        });

        // Finances summary
        const totalIncome = finances.filter(f => f.type === 'einnahme').reduce((s, f) => s + f.amount, 0);
        const totalExpense = finances.filter(f => f.type === 'ausgabe').reduce((s, f) => s + f.amount, 0);
        const balance = totalIncome - totalExpense;

        const nowFormatted = new Date().toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Remove existing modal if any
        const existing = document.getElementById('pdf-export-modal-root');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'pdf-export-modal-root';
        modal.className = 'modal-backdrop active modal-backdrop-custom';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 960px; width: 95vw; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #ffffff; border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.25); overflow: hidden;">
                <!-- Modal Top Action Bar (hidden in print) -->
                <div class="modal-header no-print d-flex align-items-center justify-content-between p-3.5" style="border-bottom: 1px solid var(--border-subtle); background: #f8fafc; flex-shrink: 0;">
                    <div class="d-flex align-items-center gap-2">
                        <span style="font-size: 1.35rem;">📄</span>
                        <div>
                            <h3 style="font-size: 1.15rem; margin: 0; color: var(--text-primary); font-weight: 800;">PDF-Vorstandsbericht & Aufgaben-Übersicht</h3>
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Druckfertige Vorlage für direkten PDF-Download oder Ausdruck</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <button type="button" class="btn btn-sm btn-donezo-primary font-bold d-flex align-items-center gap-1.5" id="trigger-pdf-download-btn" title="PDF direkt als Datei auf Ihren Computer herunterladen" style="padding: 0.5rem 1.25rem; border-radius: 10px; font-size: 0.88rem; background: #10b981; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                            <span>📥</span>
                            <span id="trigger-pdf-download-text">PDF herunterladen</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-ghost font-bold d-flex align-items-center gap-1.5" id="trigger-pdf-print-btn" title="Druckdialog des Browsers öffnen" style="padding: 0.5rem 0.95rem; font-size: 0.84rem; border: 1px solid var(--border-medium); border-radius: 10px;">
                            <span>🖨️</span>
                            <span>Drucken</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-ghost font-bold" id="trigger-json-backup-btn" title="Originales JSON-Backup herunterladen" style="padding: 0.5rem 0.85rem; font-size: 0.82rem;">
                            💾 JSON laden
                        </button>
                        <button type="button" class="btn btn-ghost modal-close-btn" style="font-size: 1.25rem; padding: 0.2rem 0.55rem; border-radius: 8px; cursor: pointer;">✕</button>
                    </div>
                </div>

                <!-- Printable Report Body (scrollable in modal, 100% visible in print) -->
                <div class="modal-body p-3 p-md-4 overflow-y-auto" style="flex: 1 1 auto; min-height: 0; max-height: calc(90vh - 72px); overflow-y: auto !important; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; background: #f8fafc;" id="pdf-report-scroll-body">
                    <div class="pdf-printable-page" id="pdf-report-content" style="background: #ffffff; padding: 2.5rem; border-radius: 14px; border: 1px solid var(--border-subtle); box-shadow: 0 4px 20px rgba(0,0,0,0.03); max-width: 860px; margin: 0 auto; color: #0f172a; font-family: 'Plus Jakarta Sans', sans-serif;">
                        
                        <!-- Official Header -->
                        <div class="d-flex align-items-center justify-content-between pb-4 mb-4" style="border-bottom: 2.5px solid #10b981;">
                            <div class="d-flex align-items-center gap-3">
                                <img src="assets/wappen_scheuring.png" alt="Wappen Scheuring" style="width: 58px; height: 68px; object-fit: contain;" />
                                <div>
                                    <h1 style="font-size: 1.45rem; font-weight: 900; margin: 0; color: #0f172a; letter-spacing: -0.02em;">Landjugend Scheuring e.V.</h1>
                                    <div style="font-size: 0.95rem; font-weight: 700; color: #10b981; margin-top: 2px;">Vorstands-Zentrale • Offizieller Statusbericht</div>
                                </div>
                            </div>
                            <div style="text-align: right; line-height: 1.4;">
                                <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">Erstellt am: ${nowFormatted}</div>
                                <div style="font-size: 0.78rem; color: #64748b; font-weight: 600;">Angemeldet: <strong>${escapeHTML(currentMember.name)}</strong> (${escapeHTML(currentMember.role)})</div>
                                <div style="font-size: 0.72rem; color: #059669; font-weight: 700;">Status: Offizielle Vereinsverwaltung</div>
                            </div>
                        </div>

                        <!-- KPI Management Summary Grid -->
                        <div style="margin-bottom: 2rem;">
                            <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
                                📊 Management-Zusammenfassung
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.65rem;">
                                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 0.85rem; text-align: center;">
                                    <span style="font-size: 1.3rem;">📋</span>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #0f172a; margin-top: 2px;">${totalTasks}</div>
                                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Gesamt</div>
                                </div>
                                <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 0.85rem; text-align: center;">
                                    <span style="font-size: 1.3rem;">✅</span>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #059669; margin-top: 2px;">${completedTasks.length} <small style="font-size: 0.8rem;">(${percent}%)</small></div>
                                    <div style="font-size: 0.72rem; font-weight: 700; color: #059669; text-transform: uppercase;">Erledigt</div>
                                </div>
                                <div style="background: #fefce8; border: 1.5px solid #fef08a; border-radius: 12px; padding: 0.85rem; text-align: center;">
                                    <span style="font-size: 1.3rem;">🔄</span>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #b45309; margin-top: 2px;">${inProgressTasks.length}</div>
                                    <div style="font-size: 0.72rem; font-weight: 700; color: #b45309; text-transform: uppercase;">In Arbeit</div>
                                </div>
                                <div style="background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.85rem; text-align: center;">
                                    <span style="font-size: 1.3rem;">⏳</span>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #334155; margin-top: 2px;">${openTasks.length}</div>
                                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Offen</div>
                                </div>
                                <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 0.85rem; text-align: center;">
                                    <span style="font-size: 1.3rem;">🚨</span>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #dc2626; margin-top: 2px;">${urgentTasks.length}</div>
                                    <div style="font-size: 0.72rem; font-weight: 700; color: #dc2626; text-transform: uppercase;">Dringend</div>
                                </div>
                            </div>
                        </div>

                        <!-- Urgent Tasks Section (if any) -->
                        ${urgentTasks.length > 0 ? `
                            <div style="margin-bottom: 2rem; background: #fff5f5; border: 1.5px solid #fca5a5; border-radius: 12px; padding: 1.25rem;">
                                <h3 style="font-size: 0.98rem; font-weight: 900; color: #991b1b; margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.4rem;">
                                    🚨 Dringende & Fällige Aufgaben (Prioritärer Fokus)
                                </h3>
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
                                    <thead>
                                        <tr style="border-bottom: 1.5px solid #fecaca; text-align: left; color: #991b1b;">
                                            <th style="padding: 0.4rem 0.5rem;">Aufgabe</th>
                                            <th style="padding: 0.4rem 0.5rem;">Zuständig</th>
                                            <th style="padding: 0.4rem 0.5rem;">Kategorie</th>
                                            <th style="padding: 0.4rem 0.5rem;">Fälligkeit</th>
                                            <th style="padding: 0.4rem 0.5rem; text-align: center;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${urgentTasks.map(t => {
                                            const m = members.find(mem => mem.id === t.assigneeId) || { name: 'Unbekannt', avatar: '👤' };
                                            const c = categories.find(cat => cat.id === t.categoryId) || { name: 'Allgemein', icon: '📋' };
                                            return `
                                                <tr style="border-bottom: 1px solid #fee2e2;">
                                                    <td style="padding: 0.45rem 0.5rem; font-weight: 800; color: #7f1d1d;">${escapeHTML(t.title)}</td>
                                                    <td style="padding: 0.45rem 0.5rem;">${m.avatar} ${escapeHTML(m.name)}</td>
                                                    <td style="padding: 0.45rem 0.5rem;">${c.icon} ${escapeHTML(c.name)}</td>
                                                    <td style="padding: 0.45rem 0.5rem; font-weight: 800; color: #dc2626;">${t.dueDate || 'Heute'}</td>
                                                    <td style="padding: 0.45rem 0.5rem; text-align: center;">
                                                        <span style="background: #fee2e2; color: #dc2626; padding: 0.15rem 0.5rem; border-radius: 8px; font-weight: 800; font-size: 0.72rem;">
                                                            ${t.status === 'in_bearbeitung' ? '🔄 In Arbeit' : '📋 Offen'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : ''}

                        <!-- Breakdown by Vorstandsmitglied (12 Members) -->
                        <div style="margin-bottom: 2.5rem;">
                            <h3 style="font-size: 1.1rem; font-weight: 900; color: #0f172a; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.4rem;">
                                👥 Aufgaben-Aufstellung nach Vorstandsmitglied (${members.length})
                            </h3>
                            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                                ${members.map(m => {
                                    const mTasks = tasks.filter(t => t.assigneeId === m.id);
                                    const mDone = mTasks.filter(t => t.status === 'erledigt').length;
                                    const mPercent = mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : 0;
                                    const color = m.color || '#10b981';

                                    return `
                                        <div style="border: 1px solid #e2e8f0; border-left: 5px solid ${color}; border-radius: 10px; overflow: hidden; page-break-inside: avoid;">
                                            <div style="background: #f8fafc; padding: 0.65rem 1rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
                                                <div style="display: flex; align-items: center; gap: 0.6rem;">
                                                    <span style="font-size: 1.2rem;">${m.avatar}</span>
                                                    <div>
                                                        <strong style="font-size: 0.95rem; color: #0f172a;">${escapeHTML(m.name)}</strong>
                                                        <span style="font-size: 0.75rem; color: #64748b; margin-left: 6px;">(${escapeHTML(m.role)})</span>
                                                    </div>
                                                </div>
                                                <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">
                                                    <span style="color: ${color};">${mDone} / ${mTasks.length}</span> erledigt (${mPercent}%)
                                                </div>
                                            </div>

                                            ${mTasks.length === 0 ? `
                                                <div style="padding: 0.6rem 1rem; font-size: 0.8rem; color: #94a3b8; font-style: italic;">
                                                    Keine Aufgaben für dieses Mitglied zugewiesen.
                                                </div>
                                            ` : `
                                                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                                                    <thead>
                                                        <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff; color: #64748b; text-align: left;">
                                                            <th style="padding: 0.45rem 1rem; width: 45%;">Aufgabe</th>
                                                            <th style="padding: 0.45rem 0.5rem; width: 22%;">Kategorie</th>
                                                            <th style="padding: 0.45rem 0.5rem; width: 13%;">Priorität</th>
                                                            <th style="padding: 0.45rem 0.5rem; width: 10%;">Fälligkeit</th>
                                                            <th style="padding: 0.45rem 1rem; width: 10%; text-align: center;">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${mTasks.map(t => {
                                                            const c = categories.find(cat => cat.id === t.categoryId) || { name: 'Allgemein', icon: '📋' };
                                                            const isDone = t.status === 'erledigt';
                                                            const inProg = t.status === 'in_bearbeitung';
                                                            const statusBadge = isDone 
                                                                ? '<span style="background: #ecfdf5; color: #059669; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 6px;">✅ Erledigt</span>'
                                                                : (inProg 
                                                                    ? '<span style="background: #fefce8; color: #b45309; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 6px;">🔄 In Arbeit</span>'
                                                                    : '<span style="background: #f1f5f9; color: #475569; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 6px;">📋 Offen</span>');
                                                            
                                                            const prioBadge = t.priority === 'hoch'
                                                                ? '<span style="color: #dc2626; font-weight: 800;">🔴 Hoch</span>'
                                                                : (t.priority === 'niedrig'
                                                                    ? '<span style="color: #10b981; font-weight: 800;">🟢 Niedrig</span>'
                                                                    : '<span style="color: #f59e0b; font-weight: 800;">🟡 Mittel</span>');

                                                            return `
                                                                <tr style="border-bottom: 1px solid #f1f5f9; background: ${isDone ? '#fafafa' : '#ffffff'};">
                                                                    <td style="padding: 0.45rem 1rem; color: #0f172a; font-weight: ${isDone ? '500' : '700'}; ${isDone ? 'text-decoration: line-through; opacity: 0.75;' : ''}">
                                                                        ${escapeHTML(t.title)}
                                                                        ${t.description && t.description !== 'Direkt über Mitgliedskarte hinzugefügt' ? `<div style="font-size: 0.72rem; color: #64748b; font-weight: normal; margin-top: 1px;">${escapeHTML(t.description)}</div>` : ''}
                                                                    </td>
                                                                    <td style="padding: 0.45rem 0.5rem; color: #475569;">
                                                                        ${c.icon} ${escapeHTML(c.name)}
                                                                    </td>
                                                                    <td style="padding: 0.45rem 0.5rem;">
                                                                        ${prioBadge}
                                                                    </td>
                                                                    <td style="padding: 0.45rem 0.5rem; font-size: 0.75rem; color: #64748b; font-weight: 600;">
                                                                        ${t.dueDate ? t.dueDate : '—'}
                                                                    </td>
                                                                    <td style="padding: 0.45rem 1rem; text-align: center; white-space: nowrap;">
                                                                        ${statusBadge}
                                                                    </td>
                                                                </tr>
                                                            `;
                                                        }).join('')}
                                                    </tbody>
                                                </table>
                                            `}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Financial Status & Contract Brief -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; page-break-inside: avoid;">
                            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.15rem; background: #ffffff;">
                                <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 0.75rem 0;">
                                    💰 Vereinskasse & Finanzen
                                </h4>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.82rem;">
                                    <span style="color: #64748b;">Gesamte Einnahmen:</span>
                                    <strong style="color: #10b981;">+${totalIncome.toFixed(2)} €</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.82rem;">
                                    <span style="color: #64748b;">Gesamte Ausgaben:</span>
                                    <strong style="color: #dc2626;">-${totalExpense.toFixed(2)} €</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #e2e8f0; padding-top: 0.5rem; font-size: 0.92rem;">
                                    <span style="font-weight: 800; color: #0f172a;">Kassenstand:</span>
                                    <strong style="color: ${balance >= 0 ? '#10b981' : '#dc2626'}; font-size: 1.05rem;">${balance.toFixed(2)} €</strong>
                                </div>
                            </div>

                            <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.15rem; background: #ffffff;">
                                <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 0.75rem 0;">
                                    📜 Verträge & Archiv
                                </h4>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.82rem;">
                                    <span style="color: #64748b;">Erfasste Verträge:</span>
                                    <strong>${contracts.length}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.82rem;">
                                    <span style="color: #64748b;">Laufende Verträge (Aktiv):</span>
                                    <strong style="color: #10b981;">${contracts.filter(c => c.status === 'Aktiv').length}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #e2e8f0; padding-top: 0.5rem; font-size: 0.82rem;">
                                    <span style="color: #64748b;">Status:</span>
                                    <strong style="color: #059669;">Ordnungsgemäß archiviert</strong>
                                </div>
                            </div>
                        </div>

                        <!-- Document Footer -->
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 1rem; text-align: center; font-size: 0.72rem; color: #94a3b8; line-height: 1.5;">
                            Landjugend Scheuring e.V. • Automatisch generierter Vorstandsbericht • Vertraulich - Nur für den internen Vorstandsbereich
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.querySelectorAll('.modal-close-btn').forEach(b => b.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Prevent wheel bubbling from scroll container to window
        const scrollBody = modal.querySelector('#pdf-report-scroll-body');
        if (scrollBody) {
            scrollBody.addEventListener('wheel', (e) => {
                e.stopPropagation();
            }, { passive: true });
        }

        // Direct PDF Download Handler
        modal.querySelector('#trigger-pdf-download-btn')?.addEventListener('click', () => {
            this.downloadPdf(modal);
        });

        // Trigger Print
        modal.querySelector('#trigger-pdf-print-btn')?.addEventListener('click', () => {
            window.print();
        });

        // Trigger JSON Backup fallback
        modal.querySelector('#trigger-json-backup-btn')?.addEventListener('click', () => {
            StorageEngine.exportFullBackup();
        });
    }

    /**
     * Generate & directly download the PDF file to the user's computer
     */
    static async downloadPdf(modal) {
        const btn = modal.querySelector('#trigger-pdf-download-btn');
        const btnText = modal.querySelector('#trigger-pdf-download-text');
        const reportContent = modal.querySelector('#pdf-report-content');
        if (!reportContent) return;

        const origText = btnText ? btnText.textContent : 'PDF herunterladen';
        if (btnText) btnText.textContent = '⏳ Erstelle PDF...';
        if (btn) btn.style.opacity = '0.75';

        const filename = `Landjugend_Scheuring_Vorstandsbericht_${new Date().toISOString().slice(0, 10)}.pdf`;

        const applySuccess = () => {
            if (btnText) btnText.textContent = '✅ PDF gespeichert!';
            if (btn) btn.style.opacity = '1';
            setTimeout(() => {
                if (btnText) btnText.textContent = origText;
            }, 3000);
        };

        try {
            // Check if html2pdf is available on window
            if (typeof window.html2pdf === 'function') {
                const opt = {
                    margin: [8, 8, 8, 8],
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                await window.html2pdf().set(opt).from(reportContent).save();
                applySuccess();
                return;
            }

            // If not available, dynamically load it from CDN
            const scriptLoaded = await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.head.appendChild(script);
            });

            if (scriptLoaded && typeof window.html2pdf === 'function') {
                const opt = {
                    margin: [8, 8, 8, 8],
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                await window.html2pdf().set(opt).from(reportContent).save();
                applySuccess();
                return;
            }

            // Fallback if completely offline / blocked
            this.triggerHtmlDownloadFallback(reportContent, filename);
            applySuccess();
        } catch (err) {
            console.error('PDF Generation failed, fallback triggered:', err);
            this.triggerHtmlDownloadFallback(reportContent, filename);
            applySuccess();
        }
    }

    /**
     * Fallback: Download standalone printable report document
     */
    static triggerHtmlDownloadFallback(reportContent, filename) {
        const htmlDoc = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Landjugend Scheuring - Vorstandsbericht</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 2cm; }
        @media print { body { padding: 0; } @page { size: A4 portrait; margin: 1cm; } }
    </style>
</head>
<body>
    ${reportContent.outerHTML}
</body>
</html>`;
        const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace('.pdf', '.html');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
