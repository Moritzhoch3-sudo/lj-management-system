/**
 * Vorstands-Dashboard & Member Analytics Engine with Direct Quick Task Input per Member Card
 */
import { CATEGORIES } from '../data.js';
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
                        <p>Echtzeit-Übersicht aller ${members.length} Vorstandsmitglieder. Trage Aufgaben direkt bei der Kachel ein.</p>
                    </div>
                    <div class="global-progress-card">
                        <div class="progress-ring-container">
                            <svg class="progress-ring" width="90" height="90">
                                <circle class="progress-ring-bg" stroke="rgba(255,255,255,0.08)" stroke-width="8" fill="transparent" r="36" cx="45" cy="45"/>
                                <circle class="progress-ring-circle" stroke="#34d399" stroke-width="8" 
                                        stroke-dasharray="226.2" 
                                        stroke-dashoffset="${226.2 - (226.2 * globalPercentage) / 100}" 
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

                <!-- Metrics Overview -->
                <div class="metrics-grid">
                    <div class="metric-card card-glow">
                        <div class="metric-icon text-success">✅</div>
                        <div class="metric-body">
                            <span class="metric-value">${completedTasks}</span>
                            <span class="metric-label">Erledigte Aufgaben</span>
                        </div>
                    </div>
                    <div class="metric-card card-glow">
                        <div class="metric-icon text-warning">⏳</div>
                        <div class="metric-body">
                            <span class="metric-value">${inProgressTasks}</span>
                            <span class="metric-label">In Bearbeitung</span>
                        </div>
                    </div>
                    <div class="metric-card card-glow">
                        <div class="metric-icon text-muted">📌</div>
                        <div class="metric-body">
                            <span class="metric-value">${openTasks}</span>
                            <span class="metric-label">Offene To-Dos</span>
                        </div>
                    </div>
                    <div class="metric-card card-glow">
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

                <!-- Members Grid with Direct Inline Quick-Add Task Field per Card -->
                <div class="members-grid">
                    ${memberStats.map(m => `
                        <div class="member-card card-glow ${m.percentage === 100 && m.total > 0 ? 'completed-star' : ''}" 
                             style="background: ${m.bgLight || 'rgba(255,255,255,0.04)'}; border-color: ${m.color}66; border-left: 4px solid ${m.color}">
                            
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
                            <div class="member-stats-row">
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

                            <!-- DIRECT INLINE TASK INPUT FIELD IN CARD -->
                            <form class="dashboard-quick-add-form d-flex gap-1 mb-2" data-member-id="${m.id}">
                                <input type="text" class="form-control form-control-sm quick-dash-title" placeholder="➕ Neue Aufgabe für ${m.name.split(' ')[0]}..." required />
                                <button type="submit" class="btn btn-sm btn-emerald text-nowrap">➕</button>
                            </form>

                            <!-- Assigned Tasks Preview -->
                            <div class="member-tasks-preview">
                                ${m.tasks.length === 0 ? `
                                    <p class="no-tasks-hint">Keine aktuellen Aufgaben</p>
                                ` : `
                                    <ul class="mini-task-list">
                                        ${m.tasks.map(t => `
                                            <li class="mini-task-item status-${t.status}">
                                                <span class="status-indicator" style="background: ${t.status === 'erledigt' ? m.color : ''}"></span>
                                                <span class="mini-task-title" title="${t.title}">${t.title}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                `}
                            </div>

                            <button class="btn btn-sm filter-user-btn mt-2" style="background: rgba(0,0,0,0.4); border: 1px solid ${m.color}88; color: #fff" data-user-id="${m.id}">
                                🔍 Aufgaben-Tabelle von ${m.name.split(' ')[0]} öffnen
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Direct Quick Task Add inside Dashboard Member Card
        containerEl.querySelectorAll('.dashboard-quick-add-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const memberId = form.dataset.memberId;
                const titleInput = form.querySelector('.quick-dash-title');
                const title = titleInput.value.trim();
                if (!title) return;

                const currentTasks = StorageEngine.getTasks();
                currentTasks.unshift({
                    id: 't_' + Date.now(),
                    title: title,
                    description: '',
                    assigneeId: memberId,
                    categoryId: 'fest',
                    priority: 'mittel',
                    status: 'offen',
                    dueDate: '',
                    subtasks: []
                });

                StorageEngine.saveTasks(currentTasks);
                this.render(containerEl, onFilterMemberClick);
            });
        });

        containerEl.querySelectorAll('.filter-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                if (onFilterMemberClick) onFilterMemberClick(userId);
            });
        });
    }
}
