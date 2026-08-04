/**
 * Central Task Management Module - Inline Quick-Add per Member Card & Structured Table View
 */
import { CATEGORIES } from '../data.js';
import { StorageEngine } from '../storage.js';

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
        const categories = CATEGORIES;

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
                                    ${m.avatar} ${m.name} (${m.role})
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
                            <option value="offen" ${currentFilterStatus === 'offen' ? 'selected' : ''}>📌 Offen</option>
                            <option value="in_bearbeitung" ${currentFilterStatus === 'in_bearbeitung' ? 'selected' : ''}>⏳ In Bearbeitung</option>
                            <option value="erledigt" ${currentFilterStatus === 'erledigt' ? 'selected' : ''}>✅ Erledigt</option>
                        </select>

                        <!-- View Switcher -->
                        <div class="view-toggle-btns">
                            <button class="btn btn-icon ${currentViewMode === 'person-list' ? 'active' : ''}" id="view-person-list-btn" title="Übersichtliche Liste nach Person">📋 Liste nach Person</button>
                            <button class="btn btn-icon ${currentViewMode === 'kanban' ? 'active' : ''}" id="view-kanban-btn" title="Kanban Board nach Status">📌 Board nach Status</button>
                        </div>
                    </div>
                </div>

                <!-- Main Viewport: Clean Person-Grouped Table with Direct Inline Add -->
                ${currentViewMode === 'person-list' 
                    ? this.renderPersonGroupedCleanTables(filteredTasks, members, categories) 
                    : this.renderKanbanBoard(filteredTasks, members, categories)
                }
            </div>
        `;

        this.bindEvents(containerEl, tasks);
    }

    /**
     * Clean Table Layout per Person with Direct Inline Quick-Add Form inside each card!
     */
    static renderPersonGroupedCleanTables(tasks, members, categories) {
        const activeMembers = currentFilterMember !== 'all' 
            ? members.filter(m => m.id === currentFilterMember)
            : members;

        return `
            <div class="person-tasks-container">
                ${activeMembers.map(m => {
                    const memberTasks = tasks.filter(t => t.assigneeId === m.id);
                    const completedCount = memberTasks.filter(t => t.status === 'erledigt').length;
                    const percent = memberTasks.length > 0 ? Math.round((completedCount / memberTasks.length) * 100) : 0;

                    return `
                        <div class="card-glow person-tasks-section mb-4" 
                             style="border-left: 5px solid ${m.color}; background: ${m.bgLight || 'rgba(255,255,255,0.03)'}">
                            
                            <!-- Person Header -->
                            <div class="person-tasks-header">
                                <div class="person-title-block">
                                    <span class="member-avatar" style="border-color: ${m.color}">${m.avatar}</span>
                                    <div>
                                        <h3 class="person-name" style="color: #fff">${m.name}</h3>
                                        <span class="person-role" style="color: ${m.color}">${m.role}</span>
                                    </div>
                                </div>

                                <div class="person-stats-badge" style="background: rgba(0,0,0,0.4); border: 1px solid ${m.color}">
                                    <span style="color: ${m.color}">${completedCount} von ${memberTasks.length} erledigt (${percent}%)</span>
                                </div>
                            </div>

                            <!-- DIRECT INLINE QUICK-ADD INPUT ROW INSIDE THE CARD -->
                            <div class="card-inline-add-bar mt-3 mb-2" style="background: rgba(0,0,0,0.25); border: 1px solid ${m.color}55; border-radius: 8px; padding: 0.6rem;">
                                <form class="inline-quick-add-form d-flex align-items-center gap-2" data-member-id="${m.id}">
                                    <input type="text" class="form-control form-control-sm quick-task-title-input" placeholder="➕ Neue Aufgabe direkt für ${m.name.split(' ')[0]} eingeben..." required />
                                    
                                    <select class="form-select form-select-sm quick-task-cat-select" style="max-width: 140px;">
                                        ${categories.map(c => `<option value="${c.id}">${c.icon} ${c.name.split(' ')[0]}</option>`).join('')}
                                    </select>

                                    <select class="form-select form-select-sm quick-task-prio-select" style="max-width: 100px;">
                                        <option value="hoch">🔴 Hoch</option>
                                        <option value="mittel" selected>🟡 Mittel</option>
                                        <option value="niedrig">🟢 Niedrig</option>
                                    </select>

                                    <input type="date" class="form-control form-control-sm quick-task-date-input" style="max-width: 130px;" />

                                    <button type="submit" class="btn btn-sm btn-emerald text-nowrap">➕ Hinzufügen</button>
                                </form>
                            </div>

                            <!-- Structured Clean Table for Tasks -->
                            ${memberTasks.length === 0 ? `
                                <div class="empty-person-tasks text-muted p-2">Keine aktuellen Aufgaben für ${m.name}. Tippe oben im Feld, um direkt eine hinzuzufügen.</div>
                            ` : `
                                <div class="table-responsive mt-2">
                                    <table class="clean-tasks-table">
                                        <thead>
                                            <tr>
                                                <th style="width: 160px;">Status</th>
                                                <th>Aufgabenname (Klick für Details)</th>
                                                <th>Kategorie</th>
                                                <th style="width: 110px;">Priorität</th>
                                                <th style="width: 170px;">Fälligkeitsdatum</th>
                                                <th style="width: 80px;">Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${memberTasks.map(t => {
                                                const cat = categories.find(c => c.id === t.categoryId) || { name: 'Allgemein', icon: '📁' };
                                                const urgency = this.calculateUrgencyBadge(t.dueDate, t.status);

                                                return `
                                                    <tr class="task-table-row status-${t.status}">
                                                        <td>
                                                            <select class="status-quick-select form-select form-select-sm" data-task-id="${t.id}">
                                                                <option value="offen" ${t.status === 'offen' ? 'selected' : ''}>📌 Offen</option>
                                                                <option value="in_bearbeitung" ${t.status === 'in_bearbeitung' ? 'selected' : ''}>⏳ In Bearbeitung</option>
                                                                <option value="erledigt" ${t.status === 'erledigt' ? 'selected' : ''}>✅ Erledigt</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <div class="clickable-task-title open-detail-btn ${t.status === 'erledigt' ? 'completed-text' : ''}" data-task-id="${t.id}">
                                                                <span class="task-title-text">${t.title}</span>
                                                                ${t.subtasks && t.subtasks.length > 0 ? `
                                                                    <span class="subtask-count-pill">${t.subtasks.filter(s => s.completed).length}/${t.subtasks.length} Subtasks</span>
                                                                ` : ''}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span class="category-badge">${cat.icon} ${cat.name}</span>
                                                        </td>
                                                        <td>
                                                            <span class="prio-badge prio-${t.priority}">${t.priority.toUpperCase()}</span>
                                                        </td>
                                                        <td>
                                                            <span class="due-date-badge ${urgency.cssClass}">
                                                                ${urgency.icon} ${t.dueDate || 'Keins'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div class="table-action-btns">
                                                                <button class="btn btn-sm btn-ghost open-detail-btn" data-task-id="${t.id}" title="Details anzeigen">🔍</button>
                                                                <button class="btn btn-sm btn-ghost danger-text delete-task-btn" data-task-id="${t.id}" title="Löschen">🗑️</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static calculateUrgencyBadge(dueDateStr, status) {
        if (status === 'erledigt' || !dueDateStr) {
            return { cssClass: 'due-normal', icon: '📅' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDateStr);
        due.setHours(0, 0, 0, 0);

        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { cssClass: 'due-overdue', icon: '🚨 Überfällig' };
        } else if (diffDays <= 3) {
            return { cssClass: 'due-urgent', icon: '⚠️ Dringend (' + diffDays + ' T.)' };
        } else {
            return { cssClass: 'due-relaxed', icon: '🟢 in ' + diffDays + ' T.' };
        }
    }

    static renderKanbanBoard(tasks, members, categories) {
        const columns = [
            { id: 'offen', title: '📌 Offen', color: '#f59e0b', tasks: tasks.filter(t => t.status === 'offen') },
            { id: 'in_bearbeitung', title: '⏳ In Bearbeitung', color: '#3b82f6', tasks: tasks.filter(t => t.status === 'in_bearbeitung') },
            { id: 'erledigt', title: '✅ Erledigt', color: '#34d399', tasks: tasks.filter(t => t.status === 'erledigt') }
        ];

        return `
            <div class="kanban-board">
                ${columns.map(col => `
                    <div class="kanban-column" data-status="${col.id}">
                        <div class="column-header" style="border-top-color: ${col.color}">
                            <h4>${col.title}</h4>
                            <span class="count-badge">${col.tasks.length}</span>
                        </div>
                        <div class="column-cards">
                            ${col.tasks.length === 0 ? `
                                <div class="empty-column-placeholder">Keine Aufgaben in dieser Spalte</div>
                            ` : col.tasks.map(t => this.renderTaskCard(t, members, categories)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    static renderTaskCard(t, members, categories) {
        const member = members.find(m => m.id === t.assigneeId) || { name: 'Nicht zugewiesen', avatar: '👤', role: '', color: '#94a3b8' };
        const cat = categories.find(c => c.id === t.categoryId) || { name: 'Allgemein', icon: '📁' };

        return `
            <div class="task-card card-glow prio-border-${t.priority}" data-task-id="${t.id}" style="border-left-color: ${member.color}">
                <div class="card-top-row">
                    <span class="category-badge">${cat.icon} ${cat.name}</span>
                    <span class="prio-badge prio-${t.priority}">${t.priority.toUpperCase()}</span>
                </div>

                <h4 class="card-title clickable-task-title open-detail-btn" data-task-id="${t.id}">${t.title}</h4>

                <div class="card-footer">
                    <div class="assignee-info">
                        <span class="assignee-avatar" style="border-color: ${member.color}">${member.avatar}</span>
                        <span class="assignee-name" style="color: ${member.color}">${member.name.split(' ')[0]}</span>
                    </div>

                    <div class="card-actions">
                        <button class="btn btn-sm btn-ghost open-detail-btn" data-task-id="${t.id}">🔍 Details</button>
                    </div>
                </div>
            </div>
        `;
    }

    static bindEvents(containerEl, tasks) {
        document.getElementById('task-search-input')?.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            this.render(containerEl);
        });

        document.getElementById('filter-member-select')?.addEventListener('change', (e) => {
            currentFilterMember = e.target.value;
            this.render(containerEl);
        });

        document.getElementById('filter-category-select')?.addEventListener('change', (e) => {
            currentFilterCategory = e.target.value;
            this.render(containerEl);
        });

        document.getElementById('filter-status-select')?.addEventListener('change', (e) => {
            currentFilterStatus = e.target.value;
            this.render(containerEl);
        });

        document.getElementById('view-person-list-btn')?.addEventListener('click', () => {
            currentViewMode = 'person-list';
            this.render(containerEl);
        });

        document.getElementById('view-kanban-btn')?.addEventListener('click', () => {
            currentViewMode = 'kanban';
            this.render(containerEl);
        });

        // Handle Direct Inline Quick-Add Task Forms inside each Member Card!
        containerEl.querySelectorAll('.inline-quick-add-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const memberId = form.dataset.memberId;
                const titleInput = form.querySelector('.quick-task-title-input');
                const catSelect = form.querySelector('.quick-task-cat-select');
                const prioSelect = form.querySelector('.quick-task-prio-select');
                const dateInput = form.querySelector('.quick-task-date-input');

                const title = titleInput.value.trim();
                if (!title) return;

                const currentTasks = StorageEngine.getTasks();
                const newTask = {
                    id: 't_' + Date.now(),
                    title: title,
                    description: '',
                    assigneeId: memberId,
                    categoryId: catSelect.value,
                    priority: prioSelect.value,
                    status: 'offen',
                    dueDate: dateInput.value || '',
                    subtasks: []
                };

                currentTasks.unshift(newTask);
                StorageEngine.saveTasks(currentTasks);
                this.render(containerEl);
            });
        });

        // Open Task Detail View Modal on Click
        containerEl.querySelectorAll('.open-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.currentTarget.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    this.openTaskDetailModal(task, containerEl);
                }
            });
        });

        // Delete task buttons
        containerEl.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = e.currentTarget.dataset.taskId;
                if (confirm('Aufgabe wirklich löschen?')) {
                    const updatedTasks = tasks.filter(t => t.id !== taskId);
                    StorageEngine.saveTasks(updatedTasks);
                    this.render(containerEl);
                }
            });
        });

        // Status change selects
        containerEl.querySelectorAll('.status-quick-select').forEach(select => {
            select.addEventListener('change', (e) => {
                e.stopPropagation();
                const taskId = e.currentTarget.dataset.taskId;
                const newStatus = e.currentTarget.value;
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex].status = newStatus;
                    StorageEngine.saveTasks(tasks);
                    this.render(containerEl);
                }
            });
        });
    }

    static openTaskDetailModal(task, mainContainerEl) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';
        const members = StorageEngine.getMembers();
        const member = members.find(m => m.id === task.assigneeId) || { name: 'Nicht zugewiesen', avatar: '👤', role: '', color: '#94a3b8' };
        const cat = CATEGORIES.find(c => c.id === task.categoryId) || { name: 'Allgemein', icon: '📁' };
        const urgency = this.calculateUrgencyBadge(task.dueDate, task.status);

        modal.innerHTML = `
            <div class="modal-card task-detail-card" style="border-top: 5px solid ${member.color}">
                <div class="modal-header">
                    <div>
                        <span class="category-badge mb-1">${cat.icon} ${cat.name}</span>
                        <h2 class="task-detail-title">${task.title}</h2>
                    </div>
                    <button class="btn btn-ghost modal-close">&times;</button>
                </div>

                <div class="task-detail-meta-row mt-2 mb-3">
                    <div class="detail-user-chip" style="background: ${member.color}22; border: 1px solid ${member.color}">
                        <span>${member.avatar}</span>
                        <strong>${member.name}</strong> (${member.role})
                    </div>
                    <span class="prio-badge prio-${task.priority}">${task.priority.toUpperCase()}</span>
                    <span class="due-date-badge ${urgency.cssClass}">${urgency.icon} Fällig: ${task.dueDate || 'Keins'}</span>
                </div>

                <div class="task-detail-body card-glow-sm p-3 mb-3">
                    <h5>📄 Genauer Aufgabenbeschrieb & Details:</h5>
                    <p class="task-description-text">${task.description ? task.description : 'Keine zusätzliche Beschreibung hinterlegt.'}</p>
                </div>

                <div class="subtasks-container p-3 mb-3">
                    <h5>Checkliste / Unteraufgaben:</h5>
                    ${(task.subtasks || []).length === 0 ? `
                        <p class="text-muted font-size-sm">Keine Unteraufgaben eingetragen.</p>
                    ` : `
                        <div class="subtasks-list mt-2">
                            ${task.subtasks.map(s => `
                                <label class="subtask-item modal-subtask">
                                    <input type="checkbox" class="modal-subtask-checkbox" data-task-id="${task.id}" data-subtask-id="${s.id}" ${s.completed ? 'checked' : ''} />
                                    <span class="${s.completed ? 'completed-text' : ''}">${s.text}</span>
                                </label>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-ghost modal-close">Schließen</button>
                    <button class="btn btn-primary edit-from-modal-btn">✏️ Bearbeiten</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => modal.remove()));

        modal.querySelectorAll('.modal-subtask-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const tasks = StorageEngine.getTasks();
                const taskId = e.target.dataset.taskId;
                const subtaskId = e.target.dataset.subtaskId;
                const taskIdx = tasks.findIndex(t => t.id === taskId);
                if (taskIdx !== -1) {
                    const subtask = (tasks[taskIdx].subtasks || []).find(s => s.id === subtaskId);
                    if (subtask) {
                        subtask.completed = e.target.checked;
                        StorageEngine.saveTasks(tasks);
                        this.render(mainContainerEl);
                    }
                }
            });
        });

        modal.querySelector('.edit-from-modal-btn')?.addEventListener('click', () => {
            modal.remove();
            this.openTaskModal(task, mainContainerEl);
        });
    }

    static openTaskModal(existingTask = null, mainContainerEl) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';
        const isEdit = !!existingTask;
        const members = StorageEngine.getMembers();

        modal.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Aufgabe bearbeiten' : '➕ Neue Aufgabe anlegen'}</h3>
                    <button class="btn btn-ghost modal-close">&times;</button>
                </div>
                <form id="task-form">
                    <div class="form-group">
                        <label>Titel der Aufgabe *</label>
                        <input type="text" id="form-title" class="form-control" required value="${existingTask ? existingTask.title : ''}" placeholder="z. B. Grillgut bestellen" />
                    </div>

                    <div class="form-group">
                        <label>Genaue Aufgabenbeschreibung & Notizen</label>
                        <textarea id="form-desc" class="form-control" rows="4" placeholder="Zusätzliche Infos, Ansprechpartner, Details...">${existingTask ? existingTask.description || '' : ''}</textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group col">
                            <label>Zugewiesene Person</label>
                            <select id="form-assignee" class="form-select">
                                ${members.map(m => `
                                    <option value="${m.id}" ${existingTask && existingTask.assigneeId === m.id ? 'selected' : ''}>
                                        ${m.avatar} ${m.name} (${m.role})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group col">
                            <label>Kategorie</label>
                            <select id="form-category" class="form-select">
                                ${CATEGORIES.map(c => `
                                    <option value="${c.id}" ${existingTask && existingTask.categoryId === c.id ? 'selected' : ''}>
                                        ${c.icon} ${c.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col">
                            <label>Priorität</label>
                            <select id="form-prio" class="form-select">
                                <option value="hoch" ${existingTask && existingTask.priority === 'hoch' ? 'selected' : ''}>🔴 Hoch</option>
                                <option value="mittel" ${!existingTask || existingTask.priority === 'mittel' ? 'selected' : ''}>🟡 Mittel</option>
                                <option value="niedrig" ${existingTask && existingTask.priority === 'niedrig' ? 'selected' : ''}>🟢 Niedrig</option>
                            </select>
                        </div>
                        <div class="form-group col">
                            <label>Status</label>
                            <select id="form-status" class="form-select">
                                <option value="offen" ${!existingTask || existingTask.status === 'offen' ? 'selected' : ''}>📌 Offen</option>
                                <option value="in_bearbeitung" ${existingTask && existingTask.status === 'in_bearbeitung' ? 'selected' : ''}>⏳ In Bearbeitung</option>
                                <option value="erledigt" ${existingTask && existingTask.status === 'erledigt' ? 'selected' : ''}>✅ Erledigt</option>
                            </select>
                        </div>
                        <div class="form-group col">
                            <label>Fälligkeitsdatum</label>
                            <input type="date" id="form-due-date" class="form-control" value="${existingTask ? existingTask.dueDate || '' : ''}" />
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-ghost modal-close">Abbrechen</button>
                        <button type="submit" class="btn btn-primary btn-glow">${isEdit ? 'Speichern' : 'Aufgabe erstellen'}</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => modal.remove()));

        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const tasks = StorageEngine.getTasks();

            const title = document.getElementById('form-title').value;
            const description = document.getElementById('form-desc').value;
            const assigneeId = document.getElementById('form-assignee').value;
            const categoryId = document.getElementById('form-category').value;
            const priority = document.getElementById('form-prio').value;
            const status = document.getElementById('form-status').value;
            const dueDate = document.getElementById('form-due-date').value;

            if (isEdit) {
                const idx = tasks.findIndex(t => t.id === existingTask.id);
                if (idx !== -1) {
                    tasks[idx] = { ...tasks[idx], title, description, assigneeId, categoryId, priority, status, dueDate };
                }
            } else {
                tasks.unshift({
                    id: 't_' + Date.now(),
                    title,
                    description,
                    assigneeId,
                    categoryId,
                    priority,
                    status,
                    dueDate,
                    subtasks: []
                });
            }

            StorageEngine.saveTasks(tasks);
            modal.remove();
            this.render(mainContainerEl);
        });
    }
}
