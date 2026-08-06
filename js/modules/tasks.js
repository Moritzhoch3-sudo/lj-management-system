/**
 * Central Task Management Module - Inline Quick-Add per Member Card & Direct Inline Table/Card Editing
 */
import { StorageEngine, escapeHTML } from '../storage.js';

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

                <!-- Main Viewport: Clean Person-Grouped Table with Direct Inline Add & Editing -->
                ${currentViewMode === 'person-list' 
                    ? this.renderPersonGroupedCleanTables(filteredTasks, members, categories) 
                    : this.renderKanbanBoard(filteredTasks, members, categories)
                }
            </div>
        `;

        this.bindEvents(containerEl, tasks, members, categories);
    }

    /**
     * Clean Table Layout per Person with Direct Inline Quick-Add Form and Direct Inline Row Editing inside each card!
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
                             style="border-left: 5px solid ${m.color}; background: #ffffff; border: 1px solid #e2e8f0;">
                            
                            <!-- Person Header -->
                            <div class="person-tasks-header d-flex align-items-center justify-content-between">
                                <div class="person-title-block d-flex align-items-center gap-2">
                                    <span class="member-avatar" style="border-color: ${m.color}66; background: ${m.color}15; color: ${m.color}; width: 36px; height: 36px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid ${m.color}40;">${m.avatar}</span>
                                    <div>
                                        <h3 class="person-name m-0" style="color: #0f172a; font-size: 1rem; font-weight: 800;">${escapeHTML(m.name)}</h3>
                                        <span class="person-role" style="color: ${m.color}; font-weight: 700; font-size: 0.78rem;">${escapeHTML(m.role)}</span>
                                    </div>
                                </div>

                                <div class="person-stats-badge" style="background: ${m.color}15; border: 1px solid ${m.color}35; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">
                                    <span style="color: ${m.color}">${completedCount} / ${memberTasks.length} erledigt (${percent}%)</span>
                                </div>
                            </div>

                            <!-- DIRECT INLINE QUICK-ADD INPUT ROW INSIDE THE CARD -->
                            <div class="card-inline-add-bar mt-2.5 mb-2" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.45rem;">
                                <form class="inline-quick-add-form d-flex align-items-center gap-2" data-member-id="${m.id}">
                                    <input type="text" class="form-control form-control-sm quick-task-title-input" placeholder="➕ Neue Aufgabe direkt für ${escapeHTML(m.name.split(' ')[0])} eingeben..." required style="font-size: 0.84rem; padding: 0.35rem 0.6rem;" />
                                    
                                    <select class="form-select form-select-sm quick-task-cat-select" style="max-width: 150px; font-size: 0.82rem;">
                                        <option value="" ${!lastCat ? 'selected' : ''} ${!lastCat ? 'disabled' : ''}>-- Kategorie --</option>
                                        ${categories.map(c => `
                                            <option value="${c.id}" ${lastCat === c.id ? 'selected' : ''}>
                                                ${c.icon} ${c.name}
                                            </option>
                                        `).join('')}
                                    </select>

                                    <select class="form-select form-select-sm quick-task-prio-select" style="max-width: 95px; font-size: 0.82rem;">
                                        <option value="hoch">🔴 Hoch</option>
                                        <option value="mittel" selected>🟡 Mittel</option>
                                        <option value="niedrig">🟢 Niedrig</option>
                                    </select>

                                    <input type="date" class="form-control form-control-sm quick-task-date-input" style="max-width: 125px; font-size: 0.82rem;" />

                                    <button type="submit" class="btn btn-sm btn-emerald text-nowrap" style="padding: 0.35rem 0.65rem; font-size: 0.82rem;">➕ Hinzufügen</button>
                                </form>
                            </div>

                            <!-- Structured Ultra-Compact Clean Table for Tasks (1 to 2 Lines Max) -->
                            ${memberTasks.length === 0 ? `
                                <div class="empty-person-tasks text-muted p-2" style="font-size: 0.82rem;">Keine aktuellen Aufgaben für ${escapeHTML(m.name)}.</div>
                            ` : `
                                <div class="table-responsive mt-1.5">
                                    <table class="clean-tasks-table compact-tasks-table w-100">
                                        <thead>
                                            <tr>
                                                <th style="width: 135px;">Status</th>
                                                <th>Aufgabe & Details</th>
                                                <th style="width: 140px;">Kategorie</th>
                                                <th style="width: 85px;">Priorität</th>
                                                <th style="width: 130px;">Fälligkeit</th>
                                                <th style="width: 80px; text-align: right;">Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${memberTasks.map(t => {
                                                const cat = categories.find(c => c.id === t.categoryId) || { name: 'Allgemein', icon: '📁' };
                                                const urgency = this.calculateUrgencyBadge(t.dueDate, t.status);
                                                const currentUserId = StorageEngine.getCurrentUserId();
                                                const canEdit = StorageEngine.canUserEditTask(t, currentUserId);

                                                return `
                                                    <tr class="task-table-row compact-row status-${t.status}">
                                                        <td style="padding: 0.35rem 0.5rem;">
                                                            <select class="status-quick-select form-select form-select-sm" data-task-id="${t.id}" ${canEdit ? '' : 'disabled title="🔒 Nur vom Inhaber oder Admin bearbeitbar"'} style="font-size: 0.78rem; padding: 0.2rem 0.4rem;">
                                                                <option value="offen" ${t.status === 'offen' ? 'selected' : ''}>📋 Offen</option>
                                                                <option value="in_bearbeitung" ${t.status === 'in_bearbeitung' ? 'selected' : ''}>🔄 Bearbeitung</option>
                                                                <option value="erledigt" ${t.status === 'erledigt' ? 'selected' : ''}>✅ Erledigt</option>
                                                            </select>
                                                        </td>
                                                        <td style="padding: 0.35rem 0.5rem;">
                                                            <div class="task-info-block ${t.status === 'erledigt' ? 'completed-text' : ''}">
                                                                <span class="task-title-text" style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">${escapeHTML(t.title)}</span>
                                                                ${t.description ? `<span class="task-note-text text-muted" style="font-size: 0.76rem; display: block; margin-top: 1px;">📝 ${escapeHTML(t.description)}</span>` : ''}
                                                            </div>
                                                        </td>
                                                        <td style="padding: 0.35rem 0.5rem;">
                                                            <span class="category-badge" style="font-size: 0.78rem; padding: 0.15rem 0.4rem;">${cat.icon} ${cat.name}</span>
                                                        </td>
                                                        <td style="padding: 0.35rem 0.5rem;">
                                                            <span class="prio-badge prio-${t.priority}" style="font-size: 0.72rem; padding: 0.15rem 0.35rem;">${t.priority.toUpperCase()}</span>
                                                        </td>
                                                        <td style="padding: 0.35rem 0.5rem;">
                                                            <span class="due-date-badge ${urgency.cssClass}" style="font-size: 0.78rem; padding: 0.15rem 0.4rem;">
                                                                ${urgency.icon} ${t.dueDate || '-'}
                                                            </span>
                                                        </td>
                                                        <td style="padding: 0.35rem 0.5rem; text-align: right;">
                                                            <div class="d-flex align-items-center justify-content-end gap-1">
                                                                ${canEdit ? `
                                                                    <button class="btn btn-sm btn-ghost toggle-inline-edit-btn" data-task-id="${t.id}" title="Bearbeiten" style="padding: 0.15rem 0.35rem; font-size: 0.8rem;">✏️</button>
                                                                    <button class="btn btn-sm btn-ghost danger-text delete-task-btn" data-task-id="${t.id}" title="Löschen" style="padding: 0.15rem 0.35rem; font-size: 0.8rem;">🗑️</button>
                                                                ` : `
                                                                    <span class="small text-muted" title="🔒 Schreibgeschützt">🔒</span>
                                                                `}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    <!-- INLINE EXPANDABLE EDIT FORM DIRECTLY IN THE TABLE ROW -->
                                                    <tr class="inline-task-edit-row hidden" id="inline-edit-row-${t.id}">
                                                        <td colspan="6" style="background: rgba(0,0,0,0.35); padding: 0.8rem; border-top: 1px dashed var(--border-color);">
                                                            <form class="inline-task-edit-form" data-task-id="${t.id}">
                                                                <div class="d-flex align-items-center justify-content-between mb-2">
                                                                    <strong style="color: #34d399; font-size: 0.9rem;">✏️ Aufgabe & Notiz direkt in der Box bearbeiten</strong>
                                                                    <button type="button" class="btn btn-sm btn-ghost cancel-inline-edit-btn" data-task-id="${t.id}">✖️ Schließen</button>
                                                                </div>

                                                                <div class="row g-2 mb-2">
                                                                    <div class="col-md-5">
                                                                        <label class="form-label small mb-1">Aufgabenname *</label>
                                                                        <input type="text" class="form-control form-control-sm edit-inline-title" value="${escapeHTML(t.title)}" required />
                                                                    </div>
                                                                    <div class="col-md-3">
                                                                        <label class="form-label small mb-1">Kategorie</label>
                                                                        <select class="form-select form-select-sm edit-inline-cat">
                                                                            ${categories.map(c => `<option value="${c.id}" ${t.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
                                                                        </select>
                                                                    </div>
                                                                    <div class="col-md-2">
                                                                        <label class="form-label small mb-1">Priorität</label>
                                                                        <select class="form-select form-select-sm edit-inline-prio">
                                                                            <option value="hoch" ${t.priority === 'hoch' ? 'selected' : ''}>🔴 Hoch</option>
                                                                            <option value="mittel" ${t.priority === 'mittel' ? 'selected' : ''}>🟡 Mittel</option>
                                                                            <option value="niedrig" ${t.priority === 'niedrig' ? 'selected' : ''}>🟢 Niedrig</option>
                                                                        </select>
                                                                    </div>
                                                                    <div class="col-md-2">
                                                                        <label class="form-label small mb-1">Fälligkeitsdatum</label>
                                                                        <input type="date" class="form-control form-control-sm edit-inline-date" value="${t.dueDate || ''}" />
                                                                    </div>
                                                                </div>

                                                                <div class="mb-2">
                                                                    <label class="form-label small mb-1">📝 Notizen, Details & Kontakte vor Ort:</label>
                                                                    <textarea class="form-control form-control-sm edit-inline-desc" rows="2" placeholder="Notizen, Zusatzinfos hier eintragen...">${escapeHTML(t.description || '')}</textarea>
                                                                </div>

                                                                <div class="d-flex justify-content-end gap-2 mt-2">
                                                                    <button type="button" class="btn btn-sm btn-ghost cancel-inline-edit-btn" data-task-id="${t.id}">Abbrechen</button>
                                                                    <button type="submit" class="btn btn-sm btn-emerald text-nowrap">💾 Speichern</button>
                                                                </div>
                                                            </form>
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
            { id: 'offen', title: '📋 Offen', color: '#f59e0b', tasks: tasks.filter(t => t.status === 'offen') },
            { id: 'in_bearbeitung', title: '🔄 In Bearbeitung', color: '#3b82f6', tasks: tasks.filter(t => t.status === 'in_bearbeitung') },
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

                <h4 class="card-title">${escapeHTML(t.title)}</h4>
                ${t.description ? `<p class="card-desc-preview text-muted small mt-1 mb-2">📝 ${escapeHTML(t.description)}</p>` : ''}

                <div class="card-footer">
                    <div class="assignee-info">
                        <span class="assignee-avatar" style="border-color: ${member.color}">${member.avatar}</span>
                        <span class="assignee-name" style="color: ${member.color}">${escapeHTML(member.name.split(' ')[0])}</span>
                    </div>

                    <div class="card-actions">
                        <button class="btn btn-sm btn-ghost toggle-inline-edit-btn" data-task-id="${t.id}">✏️ Notiz / Edit</button>
                        <button class="btn btn-sm btn-ghost danger-text delete-task-btn" data-task-id="${t.id}">🗑️</button>
                    </div>
                </div>

                <!-- INLINE EDIT FORM INSIDE KANBAN CARD -->
                <form class="inline-task-edit-form card-inline-editor mt-2 p-2 hidden" id="inline-edit-row-${t.id}" data-task-id="${t.id}" style="background: rgba(0,0,0,0.5); border-radius: 6px; border: 1px dashed var(--border-color);">
                    <label class="form-label small mb-1">Titel</label>
                    <input type="text" class="form-control form-control-sm mb-2 edit-inline-title" value="${escapeHTML(t.title)}" required />
                    
                    <label class="form-label small mb-1">📝 Notiz / Details</label>
                    <textarea class="form-control form-control-sm mb-2 edit-inline-desc" rows="2" placeholder="Notiz...">${escapeHTML(t.description || '')}</textarea>
                    
                    <div class="d-flex gap-1 mb-2">
                        <select class="form-select form-select-sm edit-inline-cat">
                            ${categories.map(c => `<option value="${c.id}" ${t.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
                        </select>
                        <select class="form-select form-select-sm edit-inline-prio">
                            <option value="hoch" ${t.priority === 'hoch' ? 'selected' : ''}>🔴 Hoch</option>
                            <option value="mittel" ${t.priority === 'mittel' ? 'selected' : ''}>🟡 Mittel</option>
                            <option value="niedrig" ${t.priority === 'niedrig' ? 'selected' : ''}>🟢 Niedrig</option>
                        </select>
                    </div>
                    <input type="date" class="form-control form-control-sm mb-2 edit-inline-date" value="${t.dueDate || ''}" />
                    <div class="d-flex justify-content-end gap-1">
                        <button type="button" class="btn btn-sm btn-ghost cancel-inline-edit-btn" data-task-id="${t.id}">Abbrechen</button>
                        <button type="submit" class="btn btn-sm btn-emerald">💾 Speichern</button>
                    </div>
                </form>
            </div>
        `;
    }

    static bindEvents(containerEl, tasks, members, categories) {
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
                const categoryId = catSelect.value;
                
                if (!title) return;
                if (!categoryId) {
                    alert('⚠️ Bitte wähle eine Kategorie für die Aufgabe aus.');
                    return;
                }

                // Save selected category for subsequent task creations
                StorageEngine.setLastSelectedCategory(categoryId);

                const currentTasks = StorageEngine.getTasks();
                const newTask = {
                    id: 't_' + Date.now(),
                    title: title,
                    description: '',
                    assigneeId: memberId,
                    categoryId: categoryId,
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

        // Toggle Inline Edit Form/Row
        containerEl.querySelectorAll('.toggle-inline-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = e.currentTarget.dataset.taskId;
                const editRow = containerEl.querySelector(`#inline-edit-row-${taskId}`);
                if (editRow) {
                    editRow.classList.toggle('hidden');
                }
            });
        });

        // Cancel Inline Edit
        containerEl.querySelectorAll('.cancel-inline-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.currentTarget.dataset.taskId;
                const editRow = containerEl.querySelector(`#inline-edit-row-${taskId}`);
                if (editRow) {
                    editRow.classList.add('hidden');
                }
            });
        });

        // Save Inline Edit Form
        containerEl.querySelectorAll('.inline-task-edit-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const taskId = form.dataset.taskId;
                const currentTasks = StorageEngine.getTasks();
                const taskIdx = currentTasks.findIndex(t => t.id === taskId);
                
                if (taskIdx !== -1) {
                    const title = form.querySelector('.edit-inline-title').value.trim();
                    const categoryId = form.querySelector('.edit-inline-cat').value;
                    const priority = form.querySelector('.edit-inline-prio').value;
                    const dueDate = form.querySelector('.edit-inline-date').value;
                    const description = form.querySelector('.edit-inline-desc').value.trim();

                    if (!title) return;

                    currentTasks[taskIdx] = {
                        ...currentTasks[taskIdx],
                        title,
                        categoryId,
                        priority,
                        dueDate,
                        description
                    };

                    StorageEngine.saveTasks(currentTasks);
                    this.render(containerEl);
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
                const currentTasks = StorageEngine.getTasks();
                const taskIndex = currentTasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    currentTasks[taskIndex].status = newStatus;
                    StorageEngine.saveTasks(currentTasks);
                    this.render(containerEl);
                }
            });
        });
    }
}
