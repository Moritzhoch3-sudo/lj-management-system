/**
 * Central Task Management Module - Clean Executive Slate Cards & Tables
 */
import { StorageEngine } from '../storage.js';
import { SecurityUtils } from '../utils/security.js';

const escapeHTML = SecurityUtils.escapeHTML.bind(SecurityUtils);

let currentFilterMember = 'all';
let currentFilterCategory = 'all';
let currentFilterStatus = 'all';
let currentSearchQuery = '';
let currentViewMode = 'person-list';

export class TasksModule {
    static setFilterMember(memberId) {
        currentFilterMember = memberId;
    }

    static render(containerEl) {
        const tasks = StorageEngine.getTasks();
        const members = StorageEngine.getMembers();
        const categories = StorageEngine.getCategories();

        // Filter tasks
        let filteredTasks = tasks.filter(t => {
            if (currentFilterMember !== 'all' && t.assigneeId !== currentFilterMember) return false;
            if (currentFilterCategory !== 'all' && t.categoryId !== currentFilterCategory) return false;
            if (currentFilterStatus !== 'all' && t.status !== currentFilterStatus) return false;
            if (currentSearchQuery.trim() !== '') {
                const q = currentSearchQuery.toLowerCase();
                const titleMatch = t.title.toLowerCase().includes(q);
                const descMatch = (t.description || '').toLowerCase().includes(q);
                if (!titleMatch && !descMatch) return false;
            }
            return true;
        });

        containerEl.innerHTML = `
            <div class="tasks-wrapper">
                <!-- Top Toolbar & Action Bar -->
                <div class="tasks-action-bar">
                    <div class="search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="task-search-input" placeholder="Aufgabe suchen..." value="${currentSearchQuery}" />
                    </div>

                    <div class="filter-controls">
                        <!-- Member Filter -->
                        <select id="filter-member-select" class="form-select">
                            <option value="all">👥 Alle Mitglieder (${members.length})</option>
                            ${members.map(m => `
                                <option value="${m.id}" ${currentFilterMember === m.id ? 'selected' : ''}>
                                    ${m.avatar} ${escapeHTML(m.name)} (${escapeHTML(m.role)})
                                </option>
                            `).join('')}
                        </select>

                        <!-- Category Filter -->
                        <select id="filter-category-select" class="form-select">
                            <option value="all">🏷️ Alle Kategorien</option>
                            ${categories.map(c => `
                                <option value="${c.id}" ${currentFilterCategory === c.id ? 'selected' : ''}>
                                    ${c.icon} ${c.name}
                                </option>
                            `).join('')}
                        </select>

                        <!-- Status Filter -->
                        <select id="filter-status-select" class="form-select">
                            <option value="all">📊 Alle Status</option>
                            <option value="offen" ${currentFilterStatus === 'offen' ? 'selected' : ''}>📋 Offen</option>
                            <option value="in_bearbeitung" ${currentFilterStatus === 'in_bearbeitung' ? 'selected' : ''}>🔄 In Bearbeitung</option>
                            <option value="erledigt" ${currentFilterStatus === 'erledigt' ? 'selected' : ''}>✅ Erledigt</option>
                        </select>

                        <!-- View Switcher -->
                        <div class="view-toggle-btns">
                            <button class="btn btn-icon ${currentViewMode === 'person-list' ? 'active' : ''}" id="view-person-list-btn" title="Übersichtliche Liste nach Person">📋 Liste nach Person</button>
                            <button class="btn btn-icon ${currentViewMode === 'kanban' ? 'active' : ''}" id="view-kanban-btn" title="Kanban Board nach Status">📊 Board nach Status</button>
                        </div>
                    </div>
                </div>

                <!-- Main Viewport -->
                ${currentViewMode === 'person-list' 
                    ? this.renderPersonGroupedCleanTables(filteredTasks, members, categories) 
                    : this.renderKanbanBoard(filteredTasks, members, categories)
                }
            </div>
        `;

        this.bindEvents(containerEl, tasks, members, categories);
    }

    /**
     * Clean Table Layout per Person with Direct Inline Quick-Add Form (NO SOLID WHITE BACKGROUNDS)
     */
    static renderPersonGroupedCleanTables(tasks, members, categories) {
        const currentUserId = StorageEngine.getCurrentUserId();

        let activeMembers = [...members];
        if (currentFilterMember !== 'all') {
            activeMembers = members.filter(m => m.id === currentFilterMember);
        } else if (currentUserId) {
            activeMembers.sort((a, b) => {
                if (a.id === currentUserId) return -1;
                if (b.id === currentUserId) return 1;
                return 0;
            });
        }
        const lastCat = StorageEngine.getLastSelectedCategory();

        return `
            <div class="person-tasks-container">
                ${activeMembers.map(m => {
                    const memberTasks = tasks.filter(t => t.assigneeId === m.id);
                    const completedCount = memberTasks.filter(t => t.status === 'erledigt').length;
                    const percent = memberTasks.length > 0 ? Math.round((completedCount / memberTasks.length) * 100) : 0;

                    return `
                        <div class="card-glow person-tasks-section mb-3.5 p-3" 
                             style="border-left: 5px solid ${m.color}; background: #1a2232; border: 1px solid var(--border-subtle);">
                            
                            <!-- Person Header -->
                            <div class="person-tasks-header d-flex align-items-center justify-content-between">
                                <div class="person-title-block d-flex align-items-center gap-2">
                                    <span class="member-avatar" style="border-color: ${m.color}88; background: ${m.color}25; color: ${m.color}; width: 40px; height: 40px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; border-radius: 6px;">${m.avatar}</span>
                                    <div>
                                        <h3 class="person-name m-0" style="color: #ffffff; font-size: 1.1rem; font-weight: 800;">${escapeHTML(m.name)}</h3>
                                        <span class="person-role" style="color: ${m.color}; font-weight: 700; font-size: 0.8rem;">${escapeHTML(m.role)}</span>
                                    </div>
                                </div>

                                <div class="person-stats-badge" style="background: #070a10; border: 1px solid var(--border-subtle); padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 800; color: #ffffff;">
                                    <span style="color: ${m.color}">${completedCount} / ${memberTasks.length} erledigt (${percent}%)</span>
                                </div>
                            </div>

                            <!-- DIRECT INLINE QUICK-ADD INPUT ROW -->
                            <div class="card-inline-add-bar mt-2.5 mb-2" style="background: #070a10; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 0.5rem;">
                                <form class="inline-quick-add-form d-flex align-items-center gap-2" data-member-id="${m.id}">
                                    <input type="text" class="form-control form-control-sm quick-task-title-input" placeholder="➕ Neue Aufgabe direkt für ${escapeHTML(m.name.split(' ')[0])} eingeben..." required style="font-size: 0.85rem; padding: 0.35rem 0.6rem; background: #070a10; color: #ffffff;" />
                                    
                                    <select class="form-select form-select-sm quick-task-cat-select" style="max-width: 150px; font-size: 0.82rem; background: #070a10; color: #ffffff;">
                                        <option value="" ${!lastCat ? 'selected' : ''} ${!lastCat ? 'disabled' : ''}>-- Kategorie --</option>
                                        ${categories.map(c => `
                                            <option value="${c.id}" ${lastCat === c.id ? 'selected' : ''}>
                                                ${c.icon} ${c.name}
                                            </option>
                                        `).join('')}
                                    </select>

                                    <select class="form-select form-select-sm quick-task-prio-select" style="max-width: 100px; font-size: 0.82rem; background: #070a10; color: #ffffff;">
                                        <option value="hoch">🔴 Hoch</option>
                                        <option value="mittel" selected>🟡 Mittel</option>
                                        <option value="niedrig">🟢 Niedrig</option>
                                    </select>

                                    <input type="date" class="form-control form-control-sm quick-task-date-input" style="max-width: 130px; font-size: 0.82rem; background: #070a10; color: #ffffff;" />

                                    <button type="submit" class="btn btn-sm btn-emerald text-nowrap" style="padding: 0.35rem 0.75rem; font-size: 0.82rem;">➕ Hinzufügen</button>
                                </form>
                            </div>

                            <!-- Clean Tasks Table -->
                            <div class="table-responsive">
                                ${memberTasks.length === 0 ? `
                                    <p class="text-muted p-2 text-center" style="font-style: italic; color: #cbd5e1 !important;">Keine Aufgaben für ${escapeHTML(m.name)} eingetragen.</p>
                                ` : `
                                    <table class="clean-tasks-table">
                                        <thead>
                                            <tr>
                                                <th style="width: 40px;"></th>
                                                <th>Aufgabe</th>
                                                <th style="width: 140px;">Kategorie</th>
                                                <th style="width: 110px;">Priorität</th>
                                                <th style="width: 130px;">Fälligkeit</th>
                                                <th style="width: 140px;">Status</th>
                                                <th style="width: 60px;"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${memberTasks.map(t => {
                                                const cat = categories.find(c => c.id === t.categoryId) || { icon: '📋', name: t.category || 'Allgemein' };
                                                const urgencyBadge = this.getUrgencyBadge(t.dueDate, t.status);

                                                return `
                                                    <tr class="task-table-row" data-task-id="${t.id}">
                                                        <td>
                                                            <input type="checkbox" class="task-row-checkbox" data-task-id="${t.id}" ${t.status === 'erledigt' ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: ${m.color}; cursor: pointer;" />
                                                        </td>
                                                        <td>
                                                            <span class="clickable-task-title ${t.status === 'erledigt' ? 'text-decoration-line-through text-muted' : ''}" data-task-id="${t.id}" style="color: #ffffff; font-weight: 700;">
                                                                ${escapeHTML(t.title)}
                                                                ${t.subtasks && t.subtasks.length > 0 ? `<span class="subtask-count-pill">☑️ ${t.subtasks.filter(s=>s.done).length}/${t.subtasks.length}</span>` : ''}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span class="badge" style="background: rgba(255,255,255,0.08); color: #ffffff; border: 1px solid var(--border-subtle);">
                                                                ${cat.icon} ${escapeHTML(cat.name)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            ${t.priority === 'hoch' ? '<span class="badge badge-danger">🔴 Hoch</span>' :
                                                              t.priority === 'niedrig' ? '<span class="badge badge-success">🟢 Niedrig</span>' :
                                                              '<span class="badge badge-warning">🟡 Mittel</span>'}
                                                        </td>
                                                        <td>
                                                            ${urgencyBadge}
                                                        </td>
                                                        <td>
                                                            <select class="form-select form-select-sm task-status-row-select" data-task-id="${t.id}" style="font-size: 0.8rem; background: #070a10; color: #ffffff;">
                                                                <option value="offen" ${t.status === 'offen' ? 'selected' : ''}>📋 Offen</option>
                                                                <option value="in_bearbeitung" ${t.status === 'in_bearbeitung' ? 'selected' : ''}>🔄 In Bearbeitung</option>
                                                                <option value="erledigt" ${t.status === 'erledigt' ? 'selected' : ''}>✅ Erledigt</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <button class="btn btn-sm btn-ghost danger-text delete-task-btn" data-task-id="${t.id}" title="Löschen">🗑️</button>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Render Kanban Board
     */
    static renderKanbanBoard(tasks, members, categories) {
        const statuses = [
            { id: 'offen', name: '📋 Offen', badgeClass: 'badge-neutral' },
            { id: 'in_bearbeitung', name: '🔄 In Bearbeitung', badgeClass: 'badge-warning' },
            { id: 'erledigt', name: '✅ Erledigt', badgeClass: 'badge-success' }
        ];

        return `
            <div class="kanban-board d-flex gap-3 overflow-x-auto pb-3">
                ${statuses.map(s => {
                    const statusTasks = tasks.filter(t => t.status === s.id);
                    return `
                        <div class="kanban-column flex-1 card-glow p-3" style="min-width: 300px; background: #1a2232; border: 1px solid var(--border-subtle);">
                            <div class="kanban-column-header d-flex justify-content-between align-items-center mb-3 pb-2" style="border-bottom: 1px solid var(--border-subtle);">
                                <h4 class="m-0" style="color: #ffffff; font-weight: 800;">${s.name}</h4>
                                <span class="badge ${s.badgeClass}">${statusTasks.length}</span>
                            </div>
                            <div class="kanban-tasks-list d-flex flex-column gap-2">
                                ${statusTasks.map(t => {
                                    const assignee = members.find(m => m.id === t.assigneeId) || { avatar: '👤', name: 'Unbekannt', color: '#94a3b8' };
                                    const cat = categories.find(c => c.id === t.categoryId) || { icon: '📋', name: 'Allgemein' };
                                    const urgencyBadge = this.getUrgencyBadge(t.dueDate, t.status);

                                    return `
                                        <div class="kanban-task-card card-glow p-2.5" data-task-id="${t.id}" style="border-left: 4px solid ${assignee.color}; background: #070a10; border: 1px solid var(--border-subtle);">
                                            <div class="d-flex align-items-center justify-content-between mb-1">
                                                <span class="badge" style="font-size: 0.7rem; background: rgba(255,255,255,0.08); color: #ffffff;">${cat.icon} ${escapeHTML(cat.name)}</span>
                                                ${urgencyBadge}
                                            </div>
                                            <h5 class="clickable-task-title my-1" data-task-id="${t.id}" style="font-size: 0.9rem; color: #ffffff; font-weight: 700;">${escapeHTML(t.title)}</h5>
                                            <div class="d-flex align-items-center justify-content-between mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.06);">
                                                <div class="d-flex align-items-center gap-1">
                                                    <span style="font-size: 0.85rem;">${assignee.avatar}</span>
                                                    <span style="font-size: 0.75rem; color: ${assignee.color}; font-weight: 700;">${escapeHTML(assignee.name)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static getUrgencyBadge(dueDateStr, status) {
        if (status === 'erledigt') {
            return `<span class="due-date-badge due-relaxed">✅ Erledigt</span>`;
        }
        if (!dueDateStr) {
            return `<span class="due-date-badge due-normal">📅 Kein Datum</span>`;
        }

        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(dueDateStr);
        due.setHours(0,0,0,0);

        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0 || diffDays === 0) {
            return `<span class="due-date-badge due-overdue">🚨 ${diffDays < 0 ? 'Überfällig' : 'Heute fällig'}</span>`;
        } else if (diffDays <= 3) {
            return `<span class="due-date-badge due-urgent">⚠️ in ${diffDays} T.</span>`;
        } else {
            return `<span class="due-date-badge due-relaxed">🟢 in ${diffDays} T.</span>`;
        }
    }

    static bindEvents(containerEl, tasks, members, categories) {
        // Search
        const searchInput = containerEl.querySelector('#task-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchQuery = e.target.value;
                this.render(containerEl);
            });
        }

        // Filters
        containerEl.querySelector('#filter-member-select')?.addEventListener('change', (e) => {
            currentFilterMember = e.target.value;
            this.render(containerEl);
        });

        containerEl.querySelector('#filter-category-select')?.addEventListener('change', (e) => {
            currentFilterCategory = e.target.value;
            this.render(containerEl);
        });

        containerEl.querySelector('#filter-status-select')?.addEventListener('change', (e) => {
            currentFilterStatus = e.target.value;
            this.render(containerEl);
        });

        // View toggle
        containerEl.querySelector('#view-person-list-btn')?.addEventListener('click', () => {
            currentViewMode = 'person-list';
            this.render(containerEl);
        });

        containerEl.querySelector('#view-kanban-btn')?.addEventListener('click', () => {
            currentViewMode = 'kanban';
            this.render(containerEl);
        });

        // Checkbox toggles in table
        containerEl.querySelectorAll('.task-row-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const taskId = e.target.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = e.target.checked ? 'erledigt' : 'offen';
                    StorageEngine.saveTasks(tasks);
                    this.render(containerEl);
                }
            });
        });

        // Status row select change
        containerEl.querySelectorAll('.task-status-row-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const taskId = e.target.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = e.target.value;
                    StorageEngine.saveTasks(tasks);
                    this.render(containerEl);
                }
            });
        });

        // Delete task
        containerEl.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                if (confirm('Aufgabe wirklich löschen?')) {
                    const updated = tasks.filter(t => t.id !== taskId);
                    StorageEngine.saveTasks(updated);
                    this.render(containerEl);
                }
            });
        });

        // Inline quick-add
        containerEl.querySelectorAll('.inline-quick-add-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const memberId = form.dataset.memberId;
                const titleInput = form.querySelector('.quick-task-title-input');
                const catSelect = form.querySelector('.quick-task-cat-select');
                const prioSelect = form.querySelector('.quick-task-prio-select');
                const dateInput = form.querySelector('.quick-task-date-input');

                const title = titleInput.value.trim();
                const catId = catSelect.value || (categories[0] ? categories[0].id : 'allgemein');
                const priority = prioSelect.value || 'mittel';
                const dueDate = dateInput.value || new Date().toISOString().slice(0, 10);

                if (title) {
                    tasks.unshift({
                        id: 't_' + Date.now(),
                        title,
                        assigneeId: memberId,
                        categoryId: catId,
                        status: 'offen',
                        priority,
                        dueDate,
                        description: 'Direkt über Mitgliedskarte hinzugefügt',
                        subtasks: []
                    });
                    StorageEngine.saveTasks(tasks);
                    if (catId) StorageEngine.setLastSelectedCategory(catId);
                    this.render(containerEl);
                }
            });
        });

        // Click task title to view modal details
        containerEl.querySelectorAll('.clickable-task-title').forEach(span => {
            span.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                if (taskId) {
                    window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId } }));
                }
            });
        });
    }
}
