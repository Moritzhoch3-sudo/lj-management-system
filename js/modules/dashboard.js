/**
 * Vorstands-Dashboard Engine with Depth Shadows, Separated Task Cards & Strict Permissions
 */
import { StorageEngine } from '../storage.js';

export class DashboardModule {
    static render(containerEl, onFilterMemberClick) {
        const tasks = StorageEngine.getTasks();
        const members = StorageEngine.getMembers();

        // Global statistics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'erledigt').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_bearbeitung').length;
        const openTasks = tasks.filter(t => t.status === 'offen').length;
        const globalPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Calculate per-member statistics
        const memberStats = members.map(m => {
            const memberTasks = tasks.filter(t => t.assigneeId === m.id);
            const mTotal = memberTasks.length;
            const mCompleted = memberTasks.filter(t => t.status === 'erledigt').length;
            const mInProgress = memberTasks.filter(t => t.status === 'in_bearbeitung').length;
            const mOpen = memberTasks.filter(t => t.status === 'offen').length;
            const mPercentage = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;

            return {
                ...m,
                tasks: memberTasks,
                total: mTotal,
                completed: mCompleted,
                inProgress: mInProgress,
                open: mOpen,
                percentage: mPercentage
            };
        });

        containerEl.innerHTML = `
            <div class="dashboard-wrapper">
                <!-- Header Banner -->
                <div class="dashboard-banner">
                    <div class="banner-content">
                        <h2>📊 Vorstands-Dashboard</h2>
                        <p>Echtzeit-Übersicht aller Vorstandsmitglieder.</p>
                    </div>

                    <!-- CLICKABLE GLOBAL PROGRESS CARD -->
                    <div class="global-progress-card" id="open-pie-chart-btn" title="Kuchen-Diagramm öffnen">
                        <div class="progress-ring-container">
                            <svg class="progress-ring" viewBox="0 0 90 90" width="80" height="80">
                                <circle class="progress-ring-bg" stroke="rgba(255,255,255,0.1)" stroke-width="8" fill="transparent" r="36" cx="45" cy="45"/>
                                <circle class="progress-ring-circle" stroke="#34d399" stroke-width="8" 
                                        stroke-dasharray="226.195" 
                                        stroke-dashoffset="${(226.195 - (226.195 * globalPercentage) / 100).toFixed(2)}" 
                                        stroke-linecap="round" fill="transparent" r="36" cx="45" cy="45"/>
                            </svg>
                            <span class="progress-ring-text">${globalPercentage}%</span>
                        </div>
                        <div class="global-progress-info">
                            <span class="label">Gesamt-Fortschritt</span>
                            <span class="value"><strong>${completedTasks}</strong> von <strong>${totalTasks}</strong> Aufgaben erledigt</span>
                        </div>
                    </div>
                </div>

                <!-- CLICKABLE METRICS OVERVIEW GRID -->
                <div class="metrics-grid">
                    <div class="metric-card card-glow" data-metric-type="erledigt" title="Erledigte Aufgaben öffnen">
                        <div class="metric-icon text-success">✅</div>
                        <div class="metric-body">
                            <span class="metric-value">${completedTasks}</span>
                            <span class="metric-label">Erledigte Aufgaben</span>
                        </div>
                    </div>

                    <div class="metric-card card-glow" data-metric-type="in_bearbeitung" title="Laufende Aufgaben öffnen">
                        <div class="metric-icon text-warning">🔄</div>
                        <div class="metric-body">
                            <span class="metric-value">${inProgressTasks}</span>
                            <span class="metric-label">In Bearbeitung</span>
                        </div>
                    </div>

                    <div class="metric-card card-glow" data-metric-type="offen" title="Offene To-Dos öffnen">
                        <div class="metric-icon text-muted">📋</div>
                        <div class="metric-body">
                            <span class="metric-value">${openTasks}</span>
                            <span class="metric-label">Offene To-Dos</span>
                        </div>
                    </div>

                    <div class="metric-card card-glow" data-metric-type="mitglieder" title="Vorstandsmitglieder Übersicht öffnen">
                        <div class="metric-icon">👥</div>
                        <div class="metric-body">
                            <span class="metric-value">${members.length}</span>
                            <span class="metric-label">Vorstandsmitglieder</span>
                        </div>
                    </div>
                </div>

                <!-- Members Section Title -->
                <div class="section-header">
                    <h3>👥 Vorstandsmitglieder (${members.length} Personen)</h3>
                </div>

                <!-- Members Grid with Interactive Checkboxes & Narrow Input Bar -->
                <div class="members-grid">
                    ${memberStats.map(m => `
                        <div class="member-card card-glow hover-highlight-card" data-member-id="${m.id}"
                             style="background: ${m.bgLight || 'rgba(255,255,255,0.04)'}; border-color: ${m.color}66; border-left: 4px solid ${m.color}; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.45);">
                            
                            <div class="member-card-header">
                                <div class="member-avatar" style="border-color: ${m.color}; background: rgba(0,0,0,0.3)">
                                    ${m.avatar}
                                </div>
                                <div class="member-details">
                                    <h4 class="member-name">${m.name}</h4>
                                    <span class="member-role" style="color: ${m.color}">${m.role}</span>
                                </div>
                                <div class="member-percent-badge" style="background: ${m.color}33; color: ${m.color}; border: 1px solid ${m.color}">
                                    ${m.percentage}%
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <div class="member-progress-container">
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" style="width: ${m.percentage}%; background-color: ${m.color};"></div>
                                </div>
                            </div>

                            <!-- Task Status Summary -->
                            <div class="member-stats-row mb-2">
                                <span class="stat-item" style="color: ${m.color}">
                                    <strong>${m.completed}</strong> Erledigt
                                </span>
                                <span class="stat-item text-warning">
                                    <strong>${m.inProgress}</strong> Laufend
                                </span>
                                <span class="stat-item text-muted">
                                    <strong>${m.open}</strong> Offen
                                </span>
                            </div>

                            <!-- SINGLE-ROW NARROW INPUT FIELD + GREEN PLUS BUTTON -->
                            <form class="dashboard-quick-add-form d-flex align-items-center gap-1 mb-2" data-member-id="${m.id}" style="width: 100%;">
                                <input type="text" class="form-control form-control-sm quick-dash-title" placeholder="➕ Neue Aufgabe..." required 
                                       style="font-size: 0.78rem; padding: 0.25rem 0.5rem; background: rgba(0,0,0,0.4); flex: 1 1 auto; max-width: calc(100% - 42px);" />
                                <button type="submit" class="btn btn-sm btn-emerald text-nowrap" style="padding: 0.25rem 0.55rem; font-weight: bold; flex: 0 0 auto; width: 36px; height: 30px;">➕</button>
                            </form>

                            <!-- Interactive Task Checkboxes List -->
                            <div class="member-tasks-preview">
                                ${m.tasks.length === 0 ? `
                                    <p class="no-tasks-hint">Keine aktuellen Aufgaben</p>
                                ` : `
                                    <ul class="mini-task-list p-0 m-0" style="list-style: none;">
                                        ${m.tasks.map(t => `
                                            <li class="mini-task-item d-flex align-items-center gap-2 py-1" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                                                <input type="checkbox" class="dash-task-checkbox" data-task-id="${t.id}" ${t.status === 'erledigt' ? 'checked' : ''} 
                                                       title="${t.status === 'erledigt' ? 'Als offen markieren' : 'Als erledigt abhaken'}"
                                                       style="cursor: pointer; width: 16px; height: 16px; accent-color: ${m.color}; flex-shrink: 0;" />
                                                <span class="mini-task-title ${t.status === 'erledigt' ? 'strikethrough-text' : ''}" 
                                                      style="font-size: 0.82rem; color: ${t.status === 'erledigt' ? '#94a3b8' : '#ffffff'}; word-break: break-word;" 
                                                      title="${t.title}">
                                                    ${t.title}
                                                </span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.bindEvents(containerEl, tasks, members, memberStats, onFilterMemberClick);
    }

    static bindEvents(containerEl, tasks, members, memberStats, onFilterMemberClick) {
        // Interactive Checkbox Click with Permission Checks
        containerEl.querySelectorAll('.dash-task-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => {
                e.stopPropagation();
                const taskId = chk.dataset.taskId;
                const currentTasks = StorageEngine.getTasks();
                const taskIndex = currentTasks.findIndex(t => t.id === taskId);
                
                if (taskIndex !== -1) {
                    const targetTask = currentTasks[taskIndex];
                    const currentUserId = StorageEngine.getCurrentUserId();

                    // Permission check: Only assignee or Moritz Kubik (Admin) can toggle task
                    if (!StorageEngine.canUserEditTask(targetTask, currentUserId)) {
                        const assignee = members.find(m => m.id === targetTask.assigneeId) || { name: 'dem Inhaber' };
                        alert(`🔒 Schreibschutz: Nur ${assignee.name} oder Moritz Kubik (2. Kassier / Admin) dürfen diese Aufgabe abhaken.`);
                        this.render(containerEl, onFilterMemberClick);
                        return;
                    }

                    if (targetTask.status === 'erledigt') {
                        targetTask.status = 'offen';
                    } else {
                        targetTask.status = 'erledigt';
                    }
                    StorageEngine.saveTasks(currentTasks);
                    this.render(containerEl, onFilterMemberClick);
                }
            });

            chk.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Click on overall progress ring / card -> Open Pie/Donut Chart Floating Pop-up
        containerEl.querySelector('#open-pie-chart-btn')?.addEventListener('click', () => {
            this.openPieChartModal(memberStats, tasks);
        });

        // Click on 4 top metric cards -> Open Member-Grouped Detail List Pop-up
        containerEl.querySelectorAll('.metric-card[data-metric-type]').forEach(card => {
            card.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.metricType;
                this.openMetricDetailModal(type, tasks, members);
            });
        });

        // Direct Quick Task Add inside Dashboard Member Card
        containerEl.querySelectorAll('.dashboard-quick-add-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.stopPropagation(); // Don't trigger card click
                e.preventDefault();
                const memberId = form.dataset.memberId;
                const titleInput = form.querySelector('.quick-dash-title');
                const title = titleInput.value.trim();
                if (!title) return;

                const currentTasks = StorageEngine.getTasks();
                const lastCat = StorageEngine.getLastSelectedCategory() || 'fest';

                currentTasks.unshift({
                    id: 't_' + Date.now(),
                    title: title,
                    description: '',
                    assigneeId: memberId,
                    categoryId: lastCat,
                    priority: 'mittel',
                    status: 'offen',
                    dueDate: '',
                    subtasks: []
                });

                StorageEngine.saveTasks(currentTasks);
                this.render(containerEl, onFilterMemberClick);
            });

            form.querySelector('.quick-dash-title')?.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Member Card Click -> Open Member Detail Pop-up Modal with Floating Outside Arrows
        containerEl.querySelectorAll('.member-card[data-member-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('form')) {
                    return;
                }
                const memberId = card.dataset.memberId;
                const memberIdx = memberStats.findIndex(m => m.id === memberId);
                if (memberIdx !== -1) {
                    this.openMemberDetailModal(memberIdx, memberStats, tasks);
                }
            });
        });
    }

    /**
     * Floating Pop-up Modal displaying single Member details with Separated Depth Cards
     */
    static openMemberDetailModal(initialIdx, memberStats, tasks) {
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        let currentIdx = initialIdx;
        const categories = StorageEngine.getCategories();

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        const renderModalContent = () => {
            const m = memberStats[currentIdx];
            const mTasks = tasks.filter(t => t.assigneeId === m.id);

            modal.innerHTML = `
                <!-- Floating Side Arrow Buttons Outside Box -->
                <button class="modal-side-arrow modal-side-arrow-left nav-prev-m" ${currentIdx === 0 ? 'disabled style="opacity: 0.25; cursor: not-allowed;"' : ''} title="Vorheriges Mitglied">
                    ◀
                </button>

                <button class="modal-side-arrow modal-side-arrow-right nav-next-m" ${currentIdx === memberStats.length - 1 ? 'disabled style="opacity: 0.25; cursor: not-allowed;"' : ''} title="Nächstes Mitglied">
                    ▶
                </button>

                <div class="modal-card" style="width: 90vw; max-width: 800px; max-height: 85vh; position: relative; box-shadow: 0 25px 60px rgba(0,0,0,0.85); border: 1px solid rgba(255,255,255,0.12);">
                    <div class="modal-header">
                        <div class="d-flex align-items-center gap-2">
                            <span style="font-size: 1.5rem; background: rgba(0,0,0,0.3); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid ${m.color}">${m.avatar}</span>
                            <div>
                                <h3 style="margin: 0; font-size: 1.15rem; color: #fff;">${m.name}</h3>
                                <small style="color: ${m.color}; font-weight: 700;">${m.role} (${m.percentage}% erledigt)</small>
                            </div>
                        </div>
                        <button class="btn btn-ghost modal-close modal-close-x" title="Schließen">&times;</button>
                    </div>

                    <!-- Member Stats Banner -->
                    <div class="d-flex align-items-center justify-content-around p-2 mb-3" style="background: ${m.color}15; border-radius: 8px; border: 1px solid ${m.color}44;">
                        <div class="text-center">
                            <small class="text-muted d-block">Fortschritt</small>
                            <strong style="color: ${m.color}; font-size: 1.1rem;">${m.percentage}%</strong>
                        </div>
                        <div class="text-center">
                            <small class="text-muted d-block">Erledigt</small>
                            <strong class="text-success">${m.completed}</strong>
                        </div>
                        <div class="text-center">
                            <small class="text-muted d-block">Laufend</small>
                            <strong class="text-warning">${m.inProgress}</strong>
                        </div>
                        <div class="text-center">
                            <small class="text-muted d-block">Offen</small>
                            <strong class="text-muted">${m.open}</strong>
                        </div>
                    </div>

                    <!-- Single Large Box with Multi-Line Task Rows -->
                    <div class="modal-body p-2" style="max-height: 60vh; overflow-y: auto;">
                        ${mTasks.length === 0 ? `
                            <p class="text-muted text-center p-4">Keine zugewiesenen Aufgaben.</p>
                        ` : `
                            <div class="card-glow p-3" style="background: rgba(17, 19, 24, 0.95); border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 10px 30px rgba(0,0,0,0.6); border-left: 4px solid ${m.color};">
                                <h5 class="mb-3" style="font-size: 0.95rem; color: #fff; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
                                    📋 Aufgabenübersicht von ${m.name} (${mTasks.length} Aufgaben)
                                </h5>

                                <div class="table-responsive">
                                    <table class="w-100" style="border-collapse: separate; border-spacing: 0 6px;">
                                        <thead>
                                            <tr style="color: #94a3b8; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left;">
                                                <th style="padding: 6px 10px;">Aufgabe</th>
                                                <th style="padding: 6px 10px; width: 140px;">Status</th>
                                                <th style="padding: 6px 10px; width: 220px;">Projekt / Kategorie</th>
                                                <th style="padding: 6px 10px; width: 110px;">Fälligkeit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${mTasks.map(t => {
                                                const cat = categories.find(c => c.id === t.categoryId) || { icon: '📁', name: 'Allgemein' };
                                                const statusBadge = t.status === 'erledigt' 
                                                    ? `<span class="badge" style="background: rgba(34,197,94,0.18); color: #34d399; border: 1px solid rgba(34,197,94,0.3); font-size: 0.78rem; font-weight: 700;">✅ Erledigt</span>`
                                                    : t.status === 'in_bearbeitung'
                                                    ? `<span class="badge" style="background: rgba(245,158,11,0.18); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); font-size: 0.78rem; font-weight: 700;">🔄 In Bearbeitung</span>`
                                                    : `<span class="badge" style="background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); font-size: 0.78rem; font-weight: 700;">📋 Offen</span>`;

                                                return `
                                                    <tr style="background: rgba(255,255,255,0.03); border-radius: 6px; transition: background 0.2s;">
                                                        <td style="padding: 10px 10px; font-weight: 600; color: #f8fafc; font-size: 0.88rem; border-radius: 6px 0 0 6px;">
                                                            <span class="${t.status === 'erledigt' ? 'strikethrough-text' : ''}">${t.title}</span>
                                                        </td>
                                                        <td style="padding: 10px 10px;">${statusBadge}</td>
                                                        <td style="padding: 10px 10px; color: #cbd5e1; font-size: 0.82rem;">
                                                            <span style="background: rgba(255,255,255,0.05); padding: 4px 9px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08); display: inline-flex; align-items: center; gap: 4px;">
                                                                ${cat.icon} ${cat.name}
                                                            </span>
                                                        </td>
                                                        <td style="padding: 10px 10px; color: #94a3b8; font-size: 0.8rem; border-radius: 0 6px 6px 0;">
                                                            ${t.dueDate ? `<span class="badge bg-dark" style="border: 1px solid rgba(255,255,255,0.12);">📅 ${t.dueDate}</span>` : '-'}
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `}
                    </div>

                    <div class="modal-footer mt-2 text-end">
                        <button class="btn btn-sm btn-ghost modal-close">Schließen</button>
                    </div>
                </div>
            `;

            modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', closeModal));

            modal.querySelector('.nav-prev-m')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentIdx > 0) {
                    currentIdx--;
                    renderModalContent();
                }
            });

            modal.querySelector('.nav-next-m')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentIdx < memberStats.length - 1) {
                    currentIdx++;
                    renderModalContent();
                }
            });
        };

        renderModalContent();
        document.body.appendChild(modal);
    }

    /**
     * Member-Grouped Floating Pop-up Modal with Background Scroll Lock
     */
    static openMetricDetailModal(type, tasks, members) {
        // Prevent Background Page Scrolling while Modal is Open
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        let title = '';
        let targetStatus = '';

        if (type === 'erledigt') {
            title = '✅ Erledigte Aufgaben (nach Vorstandsmitgliedern)';
            targetStatus = 'erledigt';
        } else if (type === 'in_bearbeitung') {
            title = '🔄 Aufgaben in Bearbeitung (nach Vorstandsmitgliedern)';
            targetStatus = 'in_bearbeitung';
        } else if (type === 'offen') {
            title = '📋 Offene To-Dos (nach Vorstandsmitgliedern)';
            targetStatus = 'offen';
        } else {
            title = '👥 Vorstandsmitglieder Übersicht';
        }

        const categories = StorageEngine.getCategories();

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 620px; width: 100%;">
                <div class="modal-header">
                    <h3 style="font-size: 1.15rem;">${title}</h3>
                    <button class="btn btn-ghost modal-close modal-close-x" title="Schließen">&times;</button>
                </div>

                <div class="modal-body p-2" style="max-height: 70vh; overflow-y: auto;">
                    ${type === 'mitglieder' ? `
                        <div class="members-summary-list">
                            ${members.map(m => {
                                const mTasks = tasks.filter(t => t.assigneeId === m.id);
                                const done = mTasks.filter(t => t.status === 'erledigt').length;
                                return `
                                    <div class="d-flex align-items-center justify-content-between p-2 mb-2" style="background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid ${m.color}">
                                        <div class="d-flex align-items-center gap-2">
                                            <span style="font-size: 1.2rem;">${m.avatar}</span>
                                            <div>
                                                <strong style="font-size: 0.9rem;">${m.name}</strong>
                                                <small class="d-block text-muted" style="font-size: 0.75rem;">${m.role}</small>
                                            </div>
                                        </div>
                                        <span class="badge" style="background: ${m.color}33; color: ${m.color}; border: 1px solid ${m.color}; font-size: 0.78rem;">
                                            ${done} von ${mTasks.length} erledigt
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <div class="member-grouped-modal-list">
                            ${members.map(m => {
                                const memberTasks = tasks.filter(t => t.assigneeId === m.id && t.status === targetStatus);
                                if (memberTasks.length === 0) return '';

                                return `
                                    <div class="member-modal-box mb-3 p-2" style="background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 4px solid ${m.color}">
                                        <div class="d-flex align-items-center gap-2 mb-2 pb-1" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                                            <span>${m.avatar}</span>
                                            <strong style="font-size: 0.92rem; color: #ffffff;">${m.name}</strong>
                                            <small style="color: ${m.color}; font-weight: 600; font-size: 0.75rem;">(${m.role})</small>
                                            <span class="badge ms-auto" style="background: ${m.color}22; color: ${m.color}; font-size: 0.72rem;">${memberTasks.length} Aufgaben</span>
                                        </div>

                                        <div class="compact-task-list">
                                            ${memberTasks.map(t => {
                                                const cat = categories.find(c => c.id === t.categoryId) || { icon: '📁', name: 'Allgemein' };
                                                return `
                                                    <div class="d-flex align-items-center justify-content-between py-1 px-2 mb-1" style="background: rgba(0,0,0,0.3); border-radius: 5px; font-size: 0.82rem;">
                                                        <span class="${t.status === 'erledigt' ? 'strikethrough-text' : ''}" style="color: #f1f5f9;">
                                                            • ${t.title}
                                                        </span>
                                                        <small class="text-muted" style="font-size: 0.72rem; margin-left: 8px;">
                                                            ${cat.icon} ${cat.name}
                                                        </small>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}

                            ${tasks.filter(t => t.status === targetStatus).length === 0 ? `
                                <p class="text-muted p-3 text-center">Keine Aufgaben in diesem Status.</p>
                            ` : ''}
                        </div>
                    `}
                </div>

                <div class="modal-footer mt-2 text-end">
                    <button class="btn btn-sm btn-ghost modal-close">Schließen</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', closeModal));
    }

    /**
     * Floating Pop-up Modal displaying SVG Donut / Pie Chart showing member completed task distribution
     */
    static openPieChartModal(memberStats, allTasks) {
        // Prevent Background Page Scrolling while Modal is Open
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        const totalCompleted = allTasks.filter(t => t.status === 'erledigt').length;
        const totalTasks = allTasks.length;
        const globalPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

        // SVG Donut Chart Calculation
        const radius = 70;
        const circumference = 2 * Math.PI * radius; // ~439.82
        let accumulatedDash = 0;

        const chartSegments = memberStats.map(m => {
            const count = m.completed;
            const portion = totalCompleted > 0 ? count / totalCompleted : 0;
            const dashLength = portion * circumference;
            const offset = -accumulatedDash;
            accumulatedDash += dashLength;

            return {
                ...m,
                count,
                portion,
                dashLength: dashLength.toFixed(2),
                offset: offset.toFixed(2)
            };
        });

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 620px; width: 100%;">
                <div class="modal-header">
                    <h3 style="font-size: 1.15rem;">🥧 Aufgaben-Fortschritt & Kuchendiagramm</h3>
                    <button class="btn btn-ghost modal-close modal-close-x" title="Schließen">&times;</button>
                </div>

                <div class="modal-body p-3 text-center" style="max-height: 70vh; overflow-y: auto;">
                    <p class="text-muted mb-3" style="font-size: 0.85rem;">Aufschlüsselung aller <strong>${totalCompleted} erledigten Aufgaben</strong> nach Vorstandsmitgliedern:</p>

                    <!-- SVG Donut Chart -->
                    <div class="pie-chart-container d-flex justify-content-center align-items-center mb-3" style="position: relative; width: 200px; height: 200px; margin: 0 auto;">
                        <svg width="200" height="200" viewBox="0 0 200 200" style="transform: rotate(-90deg); transform-origin: 50% 50%;">
                            <circle cx="100" cy="100" r="${radius}" stroke="rgba(255,255,255,0.08)" stroke-width="26" fill="transparent"/>
                            
                            ${totalCompleted === 0 ? `
                                <circle cx="100" cy="100" r="${radius}" stroke="#64748b" stroke-width="26" fill="transparent" />
                            ` : chartSegments.map(s => `
                                ${s.count > 0 ? `
                                    <circle cx="100" cy="100" r="${radius}" 
                                            stroke="${s.color}" 
                                            stroke-width="26" 
                                            fill="transparent"
                                            stroke-dasharray="${s.dashLength} ${circumference}"
                                            stroke-dashoffset="${s.offset}" />
                                ` : ''}
                            `).join('')}
                        </svg>

                        <!-- Centered Donut Label -->
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2;">
                            <strong style="font-size: 1.7rem; color: #34d399; font-weight: 900; line-height: 1;">${globalPercent}%</strong>
                            <small style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">Gesamt erledigt</small>
                        </div>
                    </div>

                    <!-- Member Color Legend -->
                    <div class="pie-legend-grid text-start" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem;">
                        ${memberStats.map(m => `
                            <div class="legend-item d-flex align-items-center gap-2 p-2" style="background: rgba(255,255,255,0.03); border-radius: 6px; border-left: 3px solid ${m.color}">
                                <span style="font-size: 1rem;">${m.avatar}</span>
                                <div>
                                    <div style="font-weight: bold; font-size: 0.8rem; color: #fff;">${m.name}</div>
                                    <small style="color: ${m.color}; font-size: 0.72rem;">${m.completed} von ${m.total} erledigt (${m.percentage}%)</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="modal-footer mt-2 text-end">
                    <button class="btn btn-sm btn-ghost modal-close">Schließen</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', closeModal));
    }
}
