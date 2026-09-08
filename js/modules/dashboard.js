/**
 * Vorstands-Dashboard Engine with Depth Shadows, Separated Task Cards & Strict Permissions
 */
import { StorageEngine } from '../storage.js';
import { SecurityUtils } from '../utils/security.js';

const escapeHTML = SecurityUtils.escapeHTML.bind(SecurityUtils);

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

                <!-- Members Grid with Executive Dark Cards (NO SOLID WHITE BACKGROUND) -->
                <div class="members-grid">
                    ${memberStats.map(m => `
                        <div class="member-card card-glow hover-highlight-card" data-member-id="${m.id}"
                             style="border-left: 5px solid ${m.color};">
                            
                            <div class="member-card-header">
                                <div class="member-avatar" style="border-color: ${m.color}88; background: ${m.color}25; color: ${m.color}; font-weight: bold;">
                                    ${m.avatar}
                                </div>
                                <div class="member-details">
                                    <h4 class="member-name" style="color: #ffffff;">${escapeHTML(m.name)}</h4>
                                    <span class="member-role" style="color: ${m.color}; font-weight: 700;">${escapeHTML(m.role)}</span>
                                </div>
                                <div class="member-percent-badge" style="background: ${m.color}25; color: #ffffff; border: 1px solid ${m.color}66; font-weight: 800;">
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
                                <span class="stat-item" style="color: ${m.color}; font-weight: bold;">
                                    <strong>${m.completed}</strong> Erledigt
                                </span>
                                <span class="stat-item text-warning" style="color: #fbbf24; font-weight: bold;">
                                    <strong>${m.inProgress}</strong> Laufend
                                </span>
                                <span class="stat-item text-muted" style="color: #e2e8f0; font-weight: bold;">
                                    <strong>${m.open}</strong> Offen
                                </span>
                            </div>

                            <!-- SINGLE-ROW NARROW INPUT FIELD + GREEN PLUS BUTTON -->
                            <form class="dashboard-quick-add-form d-flex align-items-center gap-1 mb-2" data-member-id="${m.id}" style="width: 100%;">
                                <input type="text" class="form-control form-control-sm quick-dash-title" placeholder="➕ Neue Aufgabe..." required 
                                       style="font-size: 0.85rem; padding: 0.35rem 0.6rem; background: #070a10; color: #ffffff; flex: 1 1 auto;" />
                                <button type="submit" class="btn btn-sm btn-emerald text-nowrap" style="padding: 0.35rem 0.65rem; font-weight: bold; flex: 0 0 auto;">➕</button>
                            </form>

                            <!-- Interactive Task Checkboxes List -->
                            <div class="member-tasks-preview">
                                ${m.tasks.length === 0 ? `
                                    <p class="no-tasks-hint" style="color: #cbd5e1;">Keine aktuellen Aufgaben</p>
                                ` : `
                                    <ul class="mini-task-list p-0 m-0" style="list-style: none;">
                                        ${m.tasks.map(t => `
                                            <li class="mini-task-item d-flex align-items-center gap-2 py-1" style="border-bottom: 1px solid rgba(255,255,255,0.08); color: #ffffff;">
                                                <input type="checkbox" class="dash-task-checkbox" data-task-id="${t.id}" ${t.status === 'erledigt' ? 'checked' : ''} 
                                                       style="cursor: pointer; width: 16px; height: 16px; accent-color: ${m.color};" />
                                                <span class="mini-task-title ${t.status === 'erledigt' ? 'text-decoration-line-through text-muted' : ''}" 
                                                      style="color: #ffffff; cursor: pointer; font-weight: 600;" data-task-id="${t.id}">
                                                    ${escapeHTML(t.title)}
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

        this.bindEvents(containerEl, onFilterMemberClick);
    }

    static bindEvents(containerEl, onFilterMemberClick) {
        // Task checkbox toggles
        containerEl.querySelectorAll('.dash-task-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const taskId = e.target.dataset.taskId;
                const tasks = StorageEngine.getTasks();
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = e.target.checked ? 'erledigt' : 'offen';
                    StorageEngine.saveTasks(tasks);
                    this.render(containerEl, onFilterMemberClick);
                }
            });
        });

        // Quick task add
        containerEl.querySelectorAll('.dashboard-quick-add-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const memberId = form.dataset.memberId;
                const input = form.querySelector('.quick-dash-title');
                const title = input.value.trim();

                if (title) {
                    const tasks = StorageEngine.getTasks();
                    tasks.unshift({
                        id: 't_' + Date.now(),
                        title: title,
                        assigneeId: memberId,
                        category: 'Allgemein',
                        status: 'offen',
                        priority: 'mittel',
                        dueDate: new Date().toISOString().slice(0, 10),
                        description: 'Schnellaufgabe über Dashboard erstellt',
                        subtasks: []
                    });
                    StorageEngine.saveTasks(tasks);
                    input.value = '';
                    this.render(containerEl, onFilterMemberClick);
                }
            });
        });

        // Click task title to view details
        containerEl.querySelectorAll('.mini-task-title').forEach(span => {
            span.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId } }));
            });
        });

        // Filter member click
        containerEl.querySelectorAll('.member-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('mini-task-title')) return;
                const memberId = card.dataset.memberId;
                if (onFilterMemberClick) onFilterMemberClick(memberId);
            });
        });
    }
}
