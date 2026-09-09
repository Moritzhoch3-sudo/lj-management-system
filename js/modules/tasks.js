/**
 * Central Task Management Module - Clean Executive Slate Cards & Tables
 */
import { StorageEngine } from '../storage.js';
import { SecurityUtils } from '../utils/security.js';

const escapeHTML = SecurityUtils.escapeHTML.bind(SecurityUtils);

let currentFilterMember = 'all';
let currentFilterCategory = 'all';
let currentFilterStatus = 'all';
let currentFilterDue = 'all'; // 'all', 'next_2_weeks'
let currentSearchQuery = '';
let currentViewMode = 'person-list';
let expandedMemberIds = new Set();

export class TasksModule {
    static setFilterMember(memberId) {
        currentFilterMember = memberId || 'all';
        if (memberId && memberId !== 'all') {
            expandedMemberIds.add(memberId);
        }
    }

    static setFilterCategory(catId) {
        currentFilterCategory = catId || 'all';
    }

    static setFilterStatus(status) {
        currentFilterStatus = status || 'all';
    }

    static setFilterDue(due) {
        currentFilterDue = due || 'all';
    }

    static levenshtein(a, b) {
        const m = a.length;
        const n = b.length;
        if (Math.abs(m - n) > 2) return 999;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[m][n];
    }

    /**
     * Smart Semantic & Fuzzy German Task Search Matcher
     * Supports verb prefixes (abholen <-> holen), German event synonyms, typos, and compound substrings
     */
    static matchSemanticQuery(task, query, members, categories) {
        if (!query || query.trim() === '') return true;

        const clean = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9äöüß]/gi, ' ').trim();
        const queryTokens = clean(query).split(/\s+/).filter(t => t.length >= 2);
        if (queryTokens.length === 0) return true;

        const assignee = members.find(m => m.id === task.assigneeId);
        const cat = categories.find(c => c.id === task.categoryId);

        const targetText = clean(`${task.title} ${task.description || ''} ${cat ? cat.name : ''} ${assignee ? assignee.name : ''} ${task.priority || ''} ${task.status || ''}`);
        const targetWords = targetText.split(/\s+/).filter(w => w.length >= 2);

        const SYNONYMS = {
            'holen': ['abholen', 'besorgen', 'mitbringen', 'bringen', 'kaufen', 'organisieren'],
            'abholen': ['holen', 'besorgen', 'mitbringen', 'bringen', 'kaufen', 'organisieren'],
            'besorgen': ['holen', 'abholen', 'mitbringen', 'kaufen', 'organisieren'],
            'kaufen': ['einkaufen', 'besorgen', 'holen', 'abholen'],
            'einkaufen': ['kaufen', 'besorgen', 'holen'],
            'putzen': ['reinigen', 'sauber', 'saubermachen', 'waschen'],
            'reinigen': ['putzen', 'sauber', 'saubermachen', 'waschen'],
            'sauber': ['putzen', 'reinigen', 'saubermachen'],
            'aufbau': ['aufbauen', 'aufstellen', 'herrichten'],
            'aufbauen': ['aufbau', 'aufstellen', 'herrichten'],
            'abbau': ['abbauen', 'abbrechen', 'wegräumen', 'aufräumen'],
            'abbauen': ['abbau', 'wegräumen', 'aufräumen'],
            'anrufen': ['telefonieren', 'melden', 'kontaktieren', 'fragen'],
            'kontaktieren': ['anrufen', 'fragen', 'melden'],
            'abrechnen': ['abrechnung', 'kasse', 'finanzen', 'beleg'],
            'abrechnung': ['abrechnen', 'kasse', 'finanzen', 'beleg'],
            'kasse': ['kassenstand', 'abrechnung', 'finanzen', 'geld']
        };

        const stripPrefix = (w) => {
            if (w.length <= 4) return w;
            return w.replace(/^(ab|an|auf|aus|bei|durch|ein|ent|er|ge|mit|nach|ver|vor|weg|zu)/, '');
        };

        return queryTokens.every(qToken => {
            // Direct inclusion in text
            if (targetText.includes(qToken)) return true;

            const qStem = stripPrefix(qToken);
            const syns = SYNONYMS[qToken] || SYNONYMS[qStem] || [];

            return targetWords.some(tWord => {
                if (tWord.includes(qToken) || qToken.includes(tWord)) return true;

                // Synonym matches
                if (syns.some(s => tWord.includes(s) || s.includes(tWord))) return true;

                // Prefix/suffix & stem match
                const tStem = stripPrefix(tWord);
                if (qStem.length >= 3 && tStem.length >= 3) {
                    if (tStem === qStem || tWord.endsWith(qToken) || qToken.endsWith(tWord)) return true;
                    if (tStem.includes(qStem) || qStem.includes(tStem)) return true;
                }

                // Fuzzy match for minor typos
                if (qToken.length >= 5 && tWord.length >= 5) {
                    if (this.levenshtein(qToken, tWord) <= 2) return true;
                }

                return false;
            });
        });
    }

    static render(containerEl) {
        const members = StorageEngine.getMembers();
        const categories = StorageEngine.getCategories();
        const completedTasksCount = StorageEngine.getTasks().filter(t => t.status === 'erledigt').length;

        const selectedMemberObj = currentFilterMember !== 'all' ? members.find(m => m.id === currentFilterMember) : null;
        const selectedCatObj = currentFilterCategory !== 'all' ? categories.find(c => c.id === currentFilterCategory) : null;
        const statusLabels = {
            'all': '📊 Alle Status',
            'offen': '📋 Offen',
            'in_bearbeitung': '🔄 In Bearbeitung',
            'erledigt': '✅ Erledigt'
        };
        const currentStatusLabel = statusLabels[currentFilterStatus] || '📊 Alle Status';

        containerEl.innerHTML = `
            <div class="tasks-wrapper">
                <!-- Top Toolbar & Action Bar (Clean In-App Dropdowns) -->
                <div class="tasks-action-bar">
                    <div class="search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="task-search-input" placeholder="Aufgabe suchen... (z. B. Fritteuse holen)" value="${escapeHTML(currentSearchQuery)}" />
                    </div>

                    <div class="filter-controls">
                        <!-- Custom In-App Member Filter -->
                        <div class="custom-inapp-dropdown" id="filter-member-dropdown-container" style="min-width: 220px; position: relative;">
                            <div class="custom-inapp-trigger" id="filter-member-trigger" style="height: 38px; border-radius: 10px; background: #ffffff; padding: 0 0.85rem;">
                                <span id="filter-member-display" style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                                    ${selectedMemberObj ? `${selectedMemberObj.avatar} ${escapeHTML(selectedMemberObj.name)}` : `👥 Alle Mitglieder (${members.length})`}
                                </span>
                                <span class="custom-inapp-caret">▾</span>
                            </div>
                            <div class="custom-inapp-menu hidden" id="filter-member-menu" style="min-width: 260px; max-height: 280px;">
                                <div class="custom-inapp-item ${currentFilterMember === 'all' ? 'active' : ''}" data-member-id="all">
                                    <span>👥 Alle Mitglieder (${members.length})</span>
                                    ${currentFilterMember === 'all' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                </div>
                                ${members.map(m => `
                                    <div class="custom-inapp-item ${currentFilterMember === m.id ? 'active' : ''}" data-member-id="${m.id}">
                                        <span style="display: flex; align-items: center; gap: 0.45rem;">
                                            <span>${m.avatar}</span>
                                            <span>${escapeHTML(m.name)}</span>
                                            <small style="color: var(--text-muted); font-size: 0.72rem;">(${escapeHTML(m.role)})</small>
                                        </span>
                                        ${currentFilterMember === m.id ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Custom In-App Category Filter -->
                        <div class="custom-inapp-dropdown" id="filter-category-dropdown-container" style="min-width: 175px; position: relative;">
                            <div class="custom-inapp-trigger" id="filter-category-trigger" style="height: 38px; border-radius: 10px; background: #ffffff; padding: 0 0.85rem;">
                                <span id="filter-category-display" style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                                    ${selectedCatObj ? `${selectedCatObj.icon} ${escapeHTML(selectedCatObj.name)}` : `🏷️ Alle Kategorien`}
                                </span>
                                <span class="custom-inapp-caret">▾</span>
                            </div>
                            <div class="custom-inapp-menu hidden" id="filter-category-menu" style="min-width: 200px; max-height: 280px;">
                                <div class="custom-inapp-item ${currentFilterCategory === 'all' ? 'active' : ''}" data-cat-id="all">
                                    <span>🏷️ Alle Kategorien</span>
                                    ${currentFilterCategory === 'all' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                </div>
                                ${categories.map(c => `
                                    <div class="custom-inapp-item ${currentFilterCategory === c.id ? 'active' : ''}" data-cat-id="${c.id}">
                                        <span style="display: flex; align-items: center; gap: 0.45rem;">
                                            <span>${c.icon}</span>
                                            <span>${escapeHTML(c.name)}</span>
                                        </span>
                                        ${currentFilterCategory === c.id ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Custom In-App Status Filter -->
                        <div class="custom-inapp-dropdown" id="filter-status-dropdown-container" style="min-width: 155px; position: relative;">
                            <div class="custom-inapp-trigger" id="filter-status-trigger" style="height: 38px; border-radius: 10px; background: #ffffff; padding: 0 0.85rem;">
                                <span id="filter-status-display" style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                                    ${currentStatusLabel}
                                </span>
                                <span class="custom-inapp-caret">▾</span>
                            </div>
                            <div class="custom-inapp-menu hidden" id="filter-status-menu" style="min-width: 175px;">
                                <div class="custom-inapp-item ${currentFilterStatus === 'all' ? 'active' : ''}" data-status-val="all">
                                    <span>📊 Alle Status</span>
                                    ${currentFilterStatus === 'all' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                </div>
                                <div class="custom-inapp-item ${currentFilterStatus === 'offen' ? 'active' : ''}" data-status-val="offen">
                                    <span>📋 Offen</span>
                                    ${currentFilterStatus === 'offen' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                </div>
                                <div class="custom-inapp-item ${currentFilterStatus === 'in_bearbeitung' ? 'active' : ''}" data-status-val="in_bearbeitung">
                                    <span>🔄 In Bearbeitung</span>
                                    ${currentFilterStatus === 'in_bearbeitung' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                </div>
                                <div class="custom-inapp-item ${currentFilterStatus === 'erledigt' ? 'active' : ''}" data-status-val="erledigt">
                                    <span>✅ Erledigt</span>
                                    ${currentFilterStatus === 'erledigt' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                </div>
                            </div>
                        </div>

                        <!-- View Switcher -->
                        <div class="view-toggle-btns">
                            <button class="btn btn-icon ${currentViewMode === 'person-list' ? 'active' : ''}" id="view-person-list-btn" title="Übersichtliche Liste nach Person">📋 Liste</button>
                            <button class="btn btn-icon ${currentViewMode === 'kanban' ? 'active' : ''}" id="view-kanban-btn" title="Kanban Board nach Status">📊 Board</button>
                        </div>

                        <!-- Erledigte löschen Button -->
                        <button type="button" class="delete-completed-btn" id="delete-completed-tasks-btn" title="Alle erledigten Aufgaben löschen">
                            🗑️ Erledigte löschen ${completedTasksCount > 0 ? `(${completedTasksCount})` : ''}
                        </button>
                    </div>
                </div>

                <!-- Main Dynamic Tasks Viewport -->
                <div class="tasks-content-viewport" id="tasks-content-viewport"></div>
            </div>
        `;

        this.bindToolbarEvents(containerEl);
        this.updateViewport(containerEl);
    }

    /**
     * Updates ONLY the task content viewport so the search input and toolbar stay 100% stable
     */
    static updateViewport(containerEl) {
        const viewportEl = containerEl.querySelector('#tasks-content-viewport');
        if (!viewportEl) return;

        const tasks = StorageEngine.getTasks();
        const members = StorageEngine.getMembers();
        const categories = StorageEngine.getCategories();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter tasks using semantic query, status, member, category and due date
        let filteredTasks = tasks.filter(t => {
            if (currentFilterMember !== 'all' && t.assigneeId !== currentFilterMember) return false;
            if (currentFilterCategory !== 'all' && t.categoryId !== currentFilterCategory) return false;
            if (currentFilterStatus !== 'all' && t.status !== currentFilterStatus) return false;
            if (currentFilterDue === 'next_2_weeks') {
                if (t.status === 'erledigt') return false;
                if (!t.dueDate) return false;
                const due = new Date(t.dueDate);
                due.setHours(0, 0, 0, 0);
                const diffTime = due - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 14) return false;
            }
            if (currentSearchQuery.trim() !== '') {
                return this.matchSemanticQuery(t, currentSearchQuery, members, categories);
            }
            return true;
        });

        const hasActiveFilter = (
            currentFilterMember !== 'all' ||
            currentFilterCategory !== 'all' ||
            currentFilterStatus !== 'all' ||
            currentFilterDue !== 'all' ||
            currentSearchQuery.trim() !== ''
        );

        // Auto-expand cards that have matching tasks so results are immediately visible
        if (hasActiveFilter) {
            filteredTasks.forEach(t => {
                if (t.assigneeId) expandedMemberIds.add(t.assigneeId);
            });
        }

        viewportEl.innerHTML = currentViewMode === 'person-list' 
            ? this.renderPersonGroupedCleanTables(filteredTasks, members, categories, hasActiveFilter) 
            : this.renderKanbanBoard(filteredTasks, members, categories);

        this.bindTaskEvents(containerEl, viewportEl, tasks, members, categories);
    }

    /**
     * Clean Table Layout per Person with Direct Inline Quick-Add Form (NO SOLID WHITE BACKGROUNDS)
     */
    static renderPersonGroupedCleanTables(tasks, members, categories, hasActiveFilter = false) {
        const currentUserId = StorageEngine.getCurrentUserId();

        let activeMembers = [...members];
        if (currentFilterMember !== 'all') {
            activeMembers = members.filter(m => m.id === currentFilterMember);
        } else if (hasActiveFilter) {
            // When filtering by status, category, due date or search: ONLY show people who actually have matching tasks!
            activeMembers = members.filter(m => tasks.some(t => t.assigneeId === m.id));
        } else if (currentUserId) {
            activeMembers.sort((a, b) => {
                if (a.id === currentUserId) return -1;
                if (b.id === currentUserId) return 1;
                return 0;
            });
        }

        // Empty state when no member has matching tasks
        if (activeMembers.length === 0) {
            return `
                <div class="empty-state-card text-center p-5" style="background: #ffffff; border-radius: var(--radius-lg); border: 1.5px dashed var(--border-medium); box-shadow: var(--shadow-donezo); margin-top: 1rem;">
                    <div style="font-size: 3rem; margin-bottom: 0.75rem;">🔍</div>
                    <h3 style="color: var(--text-primary); font-weight: 800; margin-bottom: 0.5rem; font-size: 1.25rem;">Keine passenden Aufgaben gefunden</h3>
                    <p style="color: var(--text-secondary); max-width: 460px; margin: 0 auto 1.5rem auto; font-size: 0.92rem; line-height: 1.5;">
                        Für die gewählten Filterkriterien wurden bei keinem Vorstandsmitglied passende Aufgaben gefunden.
                    </p>
                    <button type="button" class="btn btn-donezo-primary" id="reset-all-task-filters-btn" style="padding: 0.55rem 1.25rem; font-weight: 700; border-radius: 10px;">
                        🔄 Alle Filter zurücksetzen
                    </button>
                </div>
            `;
        }

        const lastCat = StorageEngine.getLastSelectedCategory();

        return `
            <div class="person-tasks-container">
                ${activeMembers.map(m => {
                    const memberTasks = tasks.filter(t => t.assigneeId === m.id);
                    const completedCount = memberTasks.filter(t => t.status === 'erledigt').length;
                    const percent = memberTasks.length > 0 ? Math.round((completedCount / memberTasks.length) * 100) : 0;
                    const memberColor = m.color || '#10b981';
                    const isExpanded = expandedMemberIds.has(m.id) || currentFilterMember === m.id;

                    return `
                        <div class="person-tasks-section" 
                             style="background: linear-gradient(180deg, ${memberColor}12 0%, ${memberColor}05 140px, #ffffff 220px, #ffffff 100%); 
                                    border: 1px solid ${memberColor}40; 
                                    border-left: 6px solid ${memberColor}; 
                                    border-radius: 16px; 
                                    box-shadow: 0 2px 10px -2px rgba(0, 0, 0, 0.04);
                                    margin-bottom: 0 !important;">
                            
                            <!-- Person Header with Member Color Tint and Accordion Toggle -->
                            <div class="person-tasks-header d-flex align-items-center justify-content-between p-2.5"
                                 data-toggle-member="${m.id}"
                                 style="background: ${memberColor}18; border: 1px solid ${memberColor}35; border-radius: 12px; cursor: pointer; user-select: none; transition: background 0.15s;">
                                <div class="person-title-block d-flex align-items-center gap-3">
                                    <span class="member-avatar" style="border: 2px solid ${memberColor}; background: #ffffff; color: ${memberColor}; width: 46px; height: 46px; font-size: 1.35rem; display: flex; align-items: center; justify-content: center; border-radius: 12px; box-shadow: 0 2px 8px ${memberColor}30; flex-shrink: 0;">
                                        ${m.avatar}
                                    </span>
                                    <div>
                                        <div class="d-flex align-items-center gap-2 flex-wrap">
                                            <h3 class="person-name m-0" style="color: var(--text-primary); font-size: 1.15rem; font-weight: 800;">${escapeHTML(m.name)}</h3>
                                            <span class="badge" style="background: ${memberColor}; color: #ffffff; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.65rem; border-radius: 20px;">
                                                ${escapeHTML(m.role)}
                                            </span>
                                        </div>
                                        <span style="color: var(--text-muted); font-weight: 600; font-size: 0.8rem;">Vorstandsmitglied • Landjugend Scheuring</span>
                                    </div>
                                </div>

                                <div class="person-header-actions d-flex align-items-center gap-2 flex-wrap">
                                    <div class="person-stats-badge" style="background: #ffffff; border: 1.5px solid ${memberColor}60; padding: 0.45rem 1rem; border-radius: 24px; font-size: 0.85rem; font-weight: 800; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                                        <span style="color: ${memberColor}; font-size: 0.95rem;">${completedCount} / ${memberTasks.length}</span>
                                        <span style="color: var(--text-secondary); margin-left: 4px;">erledigt (${percent}%)</span>
                                    </div>

                                    <button type="button" class="btn btn-sm toggle-member-collapse-btn" style="background: #ffffff; border: 1.5px solid ${memberColor}60; color: var(--text-primary); border-radius: 20px; font-weight: 800; font-size: 0.82rem; padding: 0.45rem 0.9rem; display: inline-flex; align-items: center; gap: 0.35rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                                        <span>${isExpanded ? '▲ Zuklappen' : `▼ Aufgaben anzeigen (${memberTasks.length})`}</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Collapsible Person Tasks Body -->
                            <div class="person-tasks-body mt-3" id="person-body-${m.id}" style="${isExpanded ? '' : 'display: none;'}">

                            <!-- DIRECT INLINE QUICK-ADD INPUT ROW -->
                            <div class="card-inline-add-bar mb-3 p-3" style="background: #ffffff; border: 1px solid var(--border-medium); border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                                <form class="inline-quick-add-form d-flex align-items-center gap-2 flex-wrap" data-member-id="${m.id}">
                                    <input type="text" class="form-control form-control-sm quick-task-title-input" placeholder="➕ Neue Aufgabe direkt für ${escapeHTML(m.name.split(' ')[0])} eingeben..." required style="flex: 1; min-width: 200px; font-size: 0.88rem; padding: 0.45rem 0.75rem; background: #ffffff; color: var(--text-primary);" />
                                    
                                    <select class="form-select form-select-sm quick-task-cat-select" style="max-width: 160px; font-size: 0.84rem; padding: 0.45rem 0.65rem; background: #ffffff; color: var(--text-primary);">
                                        <option value="" ${!lastCat ? 'selected' : ''} ${!lastCat ? 'disabled' : ''}>-- Kategorie --</option>
                                        ${categories.map(c => `
                                            <option value="${c.id}" ${lastCat === c.id ? 'selected' : ''}>
                                                ${c.icon} ${c.name}
                                            </option>
                                        `).join('')}
                                    </select>

                                    <select class="form-select form-select-sm quick-task-prio-select" style="max-width: 110px; font-size: 0.84rem; padding: 0.45rem 0.65rem; background: #ffffff; color: var(--text-primary);">
                                        <option value="hoch">🔴 Hoch</option>
                                        <option value="mittel" selected>🟡 Mittel</option>
                                        <option value="niedrig">🟢 Niedrig</option>
                                    </select>

                                    <input type="date" class="form-control form-control-sm quick-task-date-input" style="max-width: 140px; font-size: 0.84rem; padding: 0.45rem 0.65rem; background: #ffffff; color: var(--text-primary);" />

                                    <button type="submit" class="btn btn-sm btn-donezo-primary text-nowrap" style="padding: 0.45rem 0.95rem; font-size: 0.85rem;">➕ Hinzufügen</button>
                                </form>
                            </div>

                            <!-- Clean Tasks Table -->
                            <div class="table-responsive">
                                ${memberTasks.length === 0 ? `
                                    <p class="text-muted p-2 text-center" style="font-style: italic;">Keine Aufgaben für ${escapeHTML(m.name)} eingetragen.</p>
                                ` : `
                                    <table class="clean-tasks-table">
                                        <thead>
                                            <tr>
                                                <th>Aufgabe</th>
                                                <th style="width: 175px;">Kategorie</th>
                                                <th style="width: 135px;">Priorität</th>
                                                <th style="width: 130px;">Fälligkeit</th>
                                                <th style="width: 130px; text-align: center;">Status</th>
                                                <th style="width: 80px; text-align: right;">Aktion</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${memberTasks.map(t => {
                                                const cat = categories.find(c => c.id === t.categoryId) || { icon: '📋', name: t.category || 'Allgemein' };
                                                const urgencyBadge = this.getUrgencyBadge(t.dueDate, t.status);
                                                const isDone = t.status === 'erledigt';
                                                const inProg = t.status === 'in_bearbeitung';
                                                const pillClass = isDone ? 'pill-completed' : (inProg ? 'pill-progress' : 'pill-pending');
                                                const pillText = isDone ? '✅ Erledigt' : (inProg ? '🔄 In Arbeit' : '📋 Offen');

                                                return `
                                                    <tr class="task-table-row" data-task-id="${t.id}">
                                                        <td>
                                                            <span class="clickable-task-title ${isDone ? 'text-decoration-line-through text-muted' : ''}" data-task-id="${t.id}" style="color: var(--text-primary); font-weight: 700; cursor: pointer;" title="Klicken zum Bearbeiten">
                                                                ${escapeHTML(t.title)}
                                                                ${t.subtasks && t.subtasks.length > 0 ? `<span class="badge badge-neutral" style="font-size: 0.7rem; margin-left: 4px;">☑️ ${t.subtasks.filter(s=>s.done).length}/${t.subtasks.length}</span>` : ''}
                                                            </span>
                                                        </td>
                                                        <td style="position: relative;">
                                                            <div class="task-cat-picker-wrapper" style="position: relative; display: inline-block;">
                                                                <button type="button" class="badge badge-neutral task-inline-cat-trigger" data-task-id="${t.id}" title="Kategorie ändern" style="cursor: pointer; border: 1px solid var(--border-medium); padding: 0.35rem 0.65rem; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: #ffffff; color: var(--text-primary); transition: all 0.15s ease;">
                                                                    <span>${cat.icon} ${escapeHTML(cat.name)}</span>
                                                                    <span style="font-size: 0.7rem; color: var(--text-muted);">▾</span>
                                                                </button>
                                                                <div class="task-inline-picker-menu hidden" id="task-cat-menu-${t.id}">
                                                                    <div style="padding: 0.3rem 0.5rem 0.4rem; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); text-transform: uppercase;">
                                                                        🏷️ Kategorie wählen
                                                                    </div>
                                                                    ${categories.map(c => `
                                                                        <div class="task-inline-picker-item ${c.id === t.categoryId ? 'active' : ''}" data-task-id="${t.id}" data-cat-id="${c.id}">
                                                                            <span>${c.icon} ${escapeHTML(c.name)}</span>
                                                                            ${c.id === t.categoryId ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                                                        </div>
                                                                    `).join('')}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style="position: relative;">
                                                            <div class="task-prio-picker-wrapper" style="position: relative; display: inline-block;">
                                                                <button type="button" class="badge task-inline-prio-trigger ${t.priority === 'hoch' ? 'badge-danger' : (t.priority === 'niedrig' ? 'badge-success' : 'badge-warning')}" data-task-id="${t.id}" title="Priorität ändern" style="cursor: pointer; padding: 0.35rem 0.65rem; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease; border: none;">
                                                                    <span>${t.priority === 'hoch' ? '🔴 Hoch' : (t.priority === 'niedrig' ? '🟢 Niedrig' : '🟡 Mittel')}</span>
                                                                    <span style="font-size: 0.7rem; opacity: 0.8;">▾</span>
                                                                </button>
                                                                <div class="task-inline-picker-menu hidden" id="task-prio-menu-${t.id}" style="min-width: 140px;">
                                                                    <div style="padding: 0.3rem 0.5rem 0.4rem; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); text-transform: uppercase;">
                                                                        ⚡ Priorität wählen
                                                                    </div>
                                                                    <div class="task-inline-picker-item ${t.priority === 'hoch' ? 'active' : ''}" data-task-id="${t.id}" data-priority="hoch">
                                                                        <span>🔴 Hoch</span>
                                                                        ${t.priority === 'hoch' ? '<span style="color: #dc2626; font-weight: 800;">✓</span>' : ''}
                                                                    </div>
                                                                    <div class="task-inline-picker-item ${t.priority === 'mittel' || !t.priority ? 'active' : ''}" data-task-id="${t.id}" data-priority="mittel">
                                                                        <span>🟡 Mittel</span>
                                                                        ${t.priority === 'mittel' || !t.priority ? '<span style="color: #f59e0b; font-weight: 800;">✓</span>' : ''}
                                                                    </div>
                                                                    <div class="task-inline-picker-item ${t.priority === 'niedrig' ? 'active' : ''}" data-task-id="${t.id}" data-priority="niedrig">
                                                                        <span>🟢 Niedrig</span>
                                                                        ${t.priority === 'niedrig' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            ${urgencyBadge}
                                                        </td>
                                                        <td style="text-align: center;">
                                                            <span class="task-status-cycle-pill donezo-status-pill ${pillClass}" data-task-id="${t.id}" title="Klicken, um Status zu ändern (Offen ➔ In Arbeit ➔ Erledigt)">
                                                                ${pillText}
                                                            </span>
                                                        </td>
                                                        <td style="text-align: right; white-space: nowrap;">
                                                            <button class="btn btn-sm btn-ghost edit-task-btn" data-task-id="${t.id}" title="Aufgabe bearbeiten (Titel, Person, Kategorie, Notizen...)" style="padding: 0.25rem 0.45rem; font-size: 0.95rem; border-radius: 6px; margin-right: 2px;">✏️</button>
                                                            <button class="btn btn-sm btn-ghost danger-text delete-task-btn" data-task-id="${t.id}" title="Löschen" style="padding: 0.25rem 0.45rem; font-size: 0.95rem; border-radius: 6px;">🗑️</button>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                `}
                            </div>
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
                        <div class="kanban-column flex-1 p-3" style="min-width: 300px; background: #ffffff; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-donezo);">
                            <div class="kanban-column-header d-flex justify-content-between align-items-center mb-3 pb-2" style="border-bottom: 1px solid var(--border-subtle);">
                                <h4 class="m-0" style="color: var(--text-primary); font-weight: 800;">${s.name}</h4>
                                <span class="badge ${s.badgeClass}">${statusTasks.length}</span>
                            </div>
                            <div class="kanban-tasks-list d-flex flex-column gap-2">
                                ${statusTasks.map(t => {
                                    const assignee = members.find(m => m.id === t.assigneeId) || { avatar: '👤', name: 'Unbekannt', color: '#94a3b8' };
                                    const urgencyBadge = this.getUrgencyBadge(t.dueDate, t.status);
                                    const isDone = t.status === 'erledigt';

                                    // Subtle priority tinting per user request (light red, light yellow, light green)
                                    let priorityBg = '#ffffff';
                                    let priorityBorder = 'var(--border-subtle)';
                                    let priorityAccent = assignee.color || '#94a3b8';

                                    if (t.priority === 'hoch') {
                                        priorityBg = '#fff5f5';
                                        priorityBorder = '#fecaca';
                                        priorityAccent = '#ef4444';
                                    } else if (t.priority === 'mittel') {
                                        priorityBg = '#fffdf0';
                                        priorityBorder = '#fef08a';
                                        priorityAccent = '#eab308';
                                    } else if (t.priority === 'niedrig') {
                                        priorityBg = '#f4fdf8';
                                        priorityBorder = '#bbf7d0';
                                        priorityAccent = '#22c55e';
                                    }

                                    return `
                                        <div class="kanban-task-card p-3" data-task-id="${t.id}" style="border-left: 4.5px solid ${priorityAccent}; background: ${priorityBg}; border-top: 1px solid ${priorityBorder}; border-right: 1px solid ${priorityBorder}; border-bottom: 1px solid ${priorityBorder}; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); transition: transform 0.15s ease, box-shadow 0.15s ease;">
                                            <!-- Top row: Only Urgency / Due Date if present (no category / priority text clutter) -->
                                            ${t.dueDate ? `
                                                <div class="d-flex align-items-center justify-content-end mb-1">
                                                    ${urgencyBadge}
                                                </div>
                                            ` : ''}

                                            <!-- Title with Checkbox -->
                                            <div class="d-flex align-items-start gap-2 my-1">
                                                <button type="button" class="kanban-check-btn" data-task-id="${t.id}" title="${isDone ? 'Als offen markieren' : 'Als erledigt abhaken'}" style="background: none; border: none; font-size: 1.15rem; cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0; margin-top: 2px;">
                                                    ${isDone ? '✅' : '⬜'}
                                                </button>
                                                <h5 class="clickable-task-title m-0 ${isDone ? 'text-decoration-line-through text-muted' : ''}" data-task-id="${t.id}" style="font-size: 0.92rem; color: var(--text-primary); font-weight: 700; cursor: pointer; line-height: 1.35; flex: 1;" title="Klicken zum Bearbeiten">
                                                    ${escapeHTML(t.title)}
                                                    ${t.subtasks && t.subtasks.length > 0 ? `<span class="badge badge-neutral" style="font-size: 0.68rem; margin-left: 4px;">☑️ ${t.subtasks.filter(sb=>sb.done).length}/${t.subtasks.length}</span>` : ''}
                                                </h5>
                                            </div>

                                            <!-- Footer: Assignee & Action Buttons -->
                                            <div class="d-flex align-items-center justify-content-between mt-2 pt-2" style="border-top: 1px solid rgba(0,0,0,0.06);">
                                                <div class="d-flex align-items-center gap-1.5 overflow-hidden" style="max-width: 120px;" title="${escapeHTML(assignee.name)} (${escapeHTML(assignee.role || '')})">
                                                    <span style="font-size: 0.95rem; flex-shrink: 0;">${assignee.avatar}</span>
                                                    <span style="font-size: 0.76rem; color: ${assignee.color}; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(assignee.name.split(' ')[0])}</span>
                                                </div>

                                                <div class="d-flex align-items-center gap-1">
                                                    ${s.id === 'offen' ? `
                                                        <button type="button" class="btn btn-sm kanban-move-btn" data-task-id="${t.id}" data-target-status="in_bearbeitung" title="Auf In Bearbeitung setzen" style="padding: 0.2rem 0.45rem; font-size: 0.72rem; border-radius: 6px; background: #ffffff; color: #b45309; border: 1px solid #fef08a; font-weight: 700;">🔄 Starten</button>
                                                        <button type="button" class="btn btn-sm kanban-move-btn" data-task-id="${t.id}" data-target-status="erledigt" title="Als erledigt markieren" style="padding: 0.2rem 0.45rem; font-size: 0.72rem; border-radius: 6px; background: #ffffff; color: #059669; border: 1px solid #a7f3d0; font-weight: 700;">✅ Fertig</button>
                                                    ` : (s.id === 'in_bearbeitung' ? `
                                                        <button type="button" class="btn btn-sm kanban-move-btn" data-task-id="${t.id}" data-target-status="offen" title="Zurück zu Offen" style="padding: 0.2rem 0.45rem; font-size: 0.72rem; border-radius: 6px; background: #ffffff; color: var(--text-secondary); border: 1px solid var(--border-medium); font-weight: 700;">⏳ Offen</button>
                                                        <button type="button" class="btn btn-sm kanban-move-btn" data-task-id="${t.id}" data-target-status="erledigt" title="Als erledigt markieren" style="padding: 0.2rem 0.45rem; font-size: 0.72rem; border-radius: 6px; background: #ffffff; color: #059669; border: 1px solid #a7f3d0; font-weight: 700;">✅ Fertig</button>
                                                    ` : `
                                                        <button type="button" class="btn btn-sm kanban-move-btn" data-task-id="${t.id}" data-target-status="offen" title="Wiedereröffnen" style="padding: 0.2rem 0.45rem; font-size: 0.72rem; border-radius: 6px; background: #ffffff; color: var(--text-secondary); border: 1px solid var(--border-medium); font-weight: 700;">↩️ Zurück</button>
                                                    `)}
                                                    <button type="button" class="btn btn-sm btn-ghost edit-task-btn" data-task-id="${t.id}" title="Aufgabe bearbeiten" style="padding: 0.2rem 0.35rem; font-size: 0.82rem; border-radius: 6px;">✏️</button>
                                                    <button type="button" class="btn btn-sm btn-ghost danger-text delete-task-btn" data-task-id="${t.id}" title="Löschen" style="padding: 0.2rem 0.35rem; font-size: 0.82rem; border-radius: 6px;">🗑️</button>
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

    static bindToolbarEvents(containerEl) {
        // Search Input: update viewport WITHOUT re-rendering or unfocusing the search box!
        const searchInput = containerEl.querySelector('#task-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchQuery = e.target.value;
                // Auto-expand members that contain matching tasks so results are immediately visible
                if (currentSearchQuery.trim() !== '') {
                    const allTasks = StorageEngine.getTasks();
                    const members = StorageEngine.getMembers();
                    const categories = StorageEngine.getCategories();
                    allTasks.forEach(t => {
                        if (this.matchSemanticQuery(t, currentSearchQuery, members, categories)) {
                            expandedMemberIds.add(t.assigneeId);
                        }
                    });
                }
                this.updateViewport(containerEl);
            });
        }

        // Helper for setting up in-app custom dropdowns in the toolbar
        const setupToolbarDropdown = (triggerId, menuId, itemSelector, onSelect) => {
            const trigger = containerEl.querySelector(triggerId);
            const menu = containerEl.querySelector(menuId);
            if (!trigger || !menu) return;

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other toolbar dropdowns
                containerEl.querySelectorAll('.tasks-action-bar .custom-inapp-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                containerEl.querySelectorAll('.tasks-action-bar .custom-inapp-trigger').forEach(t => {
                    if (t !== trigger) t.classList.remove('active');
                });
                const isHidden = menu.classList.contains('hidden');
                menu.classList.toggle('hidden', !isHidden);
                trigger.classList.toggle('active', isHidden);
            });

            menu.querySelectorAll(itemSelector).forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onSelect(item);
                    menu.classList.add('hidden');
                    trigger.classList.remove('active');
                    this.updateViewport(containerEl);
                });
            });
        };

        // Member Filter In-App Dropdown
        setupToolbarDropdown('#filter-member-trigger', '#filter-member-menu', '.custom-inapp-item[data-member-id]', (item) => {
            currentFilterMember = item.dataset.memberId;
            const displayEl = containerEl.querySelector('#filter-member-display');
            const members = StorageEngine.getMembers();
            const member = members.find(m => m.id === currentFilterMember);
            if (displayEl) {
                displayEl.innerHTML = member 
                    ? `<span>${member.avatar}</span><span>${escapeHTML(member.name)}</span>`
                    : `<span>👥 Alle Mitglieder (${members.length})</span>`;
            }
            containerEl.querySelectorAll('#filter-member-menu .custom-inapp-item').forEach(i => {
                i.classList.toggle('active', i.dataset.memberId === currentFilterMember);
                const chk = i.querySelector('span:last-child');
                if (chk && chk.textContent === '✓') chk.remove();
                if (i.dataset.memberId === currentFilterMember) {
                    i.insertAdjacentHTML('beforeend', '<span style="color: #10b981; font-weight: 800;">✓</span>');
                }
            });
        });

        // Category Filter In-App Dropdown
        setupToolbarDropdown('#filter-category-trigger', '#filter-category-menu', '.custom-inapp-item[data-cat-id]', (item) => {
            currentFilterCategory = item.dataset.catId;
            const displayEl = containerEl.querySelector('#filter-category-display');
            const categories = StorageEngine.getCategories();
            const cat = categories.find(c => c.id === currentFilterCategory);
            if (displayEl) {
                displayEl.innerHTML = cat 
                    ? `<span>${cat.icon}</span><span>${escapeHTML(cat.name)}</span>`
                    : `<span>🏷️ Alle Kategorien</span>`;
            }
            containerEl.querySelectorAll('#filter-category-menu .custom-inapp-item').forEach(i => {
                i.classList.toggle('active', i.dataset.catId === currentFilterCategory);
                const chk = i.querySelector('span:last-child');
                if (chk && chk.textContent === '✓') chk.remove();
                if (i.dataset.catId === currentFilterCategory) {
                    i.insertAdjacentHTML('beforeend', '<span style="color: #10b981; font-weight: 800;">✓</span>');
                }
            });
        });

        // Status Filter In-App Dropdown
        setupToolbarDropdown('#filter-status-trigger', '#filter-status-menu', '.custom-inapp-item[data-status-val]', (item) => {
            currentFilterStatus = item.dataset.statusVal;
            const displayEl = containerEl.querySelector('#filter-status-display');
            const statusLabels = {
                'all': '📊 Alle Status',
                'offen': '📋 Offen',
                'in_bearbeitung': '🔄 In Bearbeitung',
                'erledigt': '✅ Erledigt'
            };
            if (displayEl) {
                displayEl.innerHTML = `<span>${statusLabels[currentFilterStatus] || '📊 Alle Status'}</span>`;
            }
            containerEl.querySelectorAll('#filter-status-menu .custom-inapp-item').forEach(i => {
                i.classList.toggle('active', i.dataset.statusVal === currentFilterStatus);
                const chk = i.querySelector('span:last-child');
                if (chk && chk.textContent === '✓') chk.remove();
                if (i.dataset.statusVal === currentFilterStatus) {
                    i.insertAdjacentHTML('beforeend', '<span style="color: #10b981; font-weight: 800;">✓</span>');
                }
            });
        });

        // Close toolbar in-app dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tasks-action-bar .custom-inapp-dropdown')) {
                containerEl.querySelectorAll('.tasks-action-bar .custom-inapp-menu').forEach(m => m.classList.add('hidden'));
                containerEl.querySelectorAll('.tasks-action-bar .custom-inapp-trigger').forEach(t => t.classList.remove('active'));
            }
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

        // Delete completed tasks button with confirmation modal
        containerEl.querySelector('#delete-completed-tasks-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDeleteCompletedModal(containerEl);
        });
    }

    static resetAllFilters(containerEl) {
        currentFilterMember = 'all';
        currentFilterCategory = 'all';
        currentFilterStatus = 'all';
        currentFilterDue = 'all';
        currentSearchQuery = '';
        expandedMemberIds.clear();
        this.render(containerEl);
    }

    static bindTaskEvents(containerEl, viewportEl, tasks, members, categories) {
        // Reset all filters button in empty state
        viewportEl.querySelector('#reset-all-task-filters-btn')?.addEventListener('click', () => {
            this.resetAllFilters(containerEl);
        });

        // Person Card Collapse / Expand Accordion Toggle (Bound ONLY to header to eliminate double-firing!)
        viewportEl.querySelectorAll('.person-tasks-header[data-toggle-member]').forEach(header => {
            header.addEventListener('click', (e) => {
                // Prevent toggle if clicking on interactive form elements or delete button
                if (e.target.closest('input') || e.target.closest('select') || e.target.closest('form') || e.target.closest('.delete-task-btn')) return;

                const memberId = header.dataset.toggleMember;
                if (!memberId) return;

                const bodyEl = viewportEl.querySelector(`#person-body-${memberId}`);
                const btnEl = header.querySelector('.toggle-member-collapse-btn');
                const count = bodyEl ? bodyEl.querySelectorAll('.task-table-row').length : 0;

                if (expandedMemberIds.has(memberId)) {
                    expandedMemberIds.delete(memberId);
                    if (bodyEl) bodyEl.style.display = 'none';
                    if (btnEl) btnEl.innerHTML = `<span>▼ Aufgaben anzeigen (${count})</span>`;
                } else {
                    expandedMemberIds.add(memberId);
                    if (bodyEl) bodyEl.style.display = 'block';
                    if (btnEl) btnEl.innerHTML = `<span>▲ Zuklappen</span>`;
                }
            });
        });

        // Interactive Status Pill Click (Cycles: Offen -> In Arbeit -> Erledigt -> Offen)
        viewportEl.querySelectorAll('.task-status-cycle-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = e.currentTarget.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    const cycleMap = {
                        'offen': 'in_bearbeitung',
                        'in_bearbeitung': 'erledigt',
                        'erledigt': 'offen'
                    };
                    task.status = cycleMap[task.status] || 'offen';
                    StorageEngine.saveTasks(tasks);
                    this.updateViewport(containerEl);
                }
            });
        });

        // Kanban Quick Check-Off Button
        viewportEl.querySelectorAll('.kanban-check-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = (task.status === 'erledigt') ? 'offen' : 'erledigt';
                    StorageEngine.saveTasks(tasks);
                    this.updateViewport(containerEl);
                }
            });
        });

        // Kanban Quick Move Button (Starten / Fertig / Offen / Zurück)
        viewportEl.querySelectorAll('.kanban-move-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                const newStatus = btn.dataset.targetStatus;
                const task = tasks.find(t => t.id === taskId);
                if (task && newStatus) {
                    task.status = newStatus;
                    StorageEngine.saveTasks(tasks);
                    this.updateViewport(containerEl);
                }
            });
        });

        // Delete task
        viewportEl.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = btn.dataset.taskId;
                if (confirm('Aufgabe wirklich löschen?')) {
                    StorageEngine.markTaskDeleted(taskId);
                    const updated = tasks.filter(t => t.id !== taskId);
                    StorageEngine.saveTasks(updated);
                    this.updateViewport(containerEl);
                }
            });
        });

        // Inline quick-add
        viewportEl.querySelectorAll('.inline-quick-add-form').forEach(form => {
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
                    expandedMemberIds.add(memberId);
                    this.updateViewport(containerEl);
                }
            });
        });

        // Click task title to view modal details
        viewportEl.querySelectorAll('.clickable-task-title').forEach(span => {
            span.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                if (taskId) {
                    this.openTaskModal(taskId, containerEl);
                }
            });
        });

        // Click edit task button (✏️) to open full edit modal
        viewportEl.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                if (taskId) {
                    this.openTaskModal(taskId, containerEl);
                }
            });
        });

        // Inline category picker toggle & selection
        viewportEl.querySelectorAll('.task-inline-cat-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = trigger.dataset.taskId;
                const menu = viewportEl.querySelector(`#task-cat-menu-${taskId}`);
                viewportEl.querySelectorAll('.task-inline-picker-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                if (menu) menu.classList.toggle('hidden');
            });
        });

        viewportEl.querySelectorAll('.task-inline-picker-item[data-cat-id]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = item.dataset.taskId;
                const catId = item.dataset.catId;
                const currentTasks = StorageEngine.getTasks();
                const target = currentTasks.find(t => t.id === taskId);
                if (target) {
                    target.categoryId = catId;
                    StorageEngine.saveTasks(currentTasks);
                    this.updateViewport(containerEl);
                }
            });
        });

        // Inline priority picker toggle & selection
        viewportEl.querySelectorAll('.task-inline-prio-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = trigger.dataset.taskId;
                const menu = viewportEl.querySelector(`#task-prio-menu-${taskId}`);
                viewportEl.querySelectorAll('.task-inline-picker-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                if (menu) menu.classList.toggle('hidden');
            });
        });

        viewportEl.querySelectorAll('.task-inline-picker-item[data-priority]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = item.dataset.taskId;
                const priority = item.dataset.priority;
                const currentTasks = StorageEngine.getTasks();
                const target = currentTasks.find(t => t.id === taskId);
                if (target) {
                    target.priority = priority;
                    StorageEngine.saveTasks(currentTasks);
                    this.updateViewport(containerEl);
                }
            });
        });

        // Close inline picker menus on click outside
        const closePickersOnDocClick = (e) => {
            if (!e.target.closest('.task-cat-picker-wrapper') && !e.target.closest('.task-prio-picker-wrapper')) {
                viewportEl.querySelectorAll('.task-inline-picker-menu').forEach(m => m.classList.add('hidden'));
            }
        };
        if (viewportEl._taskDocPickerHandler) {
            document.removeEventListener('click', viewportEl._taskDocPickerHandler);
        }
        viewportEl._taskDocPickerHandler = closePickersOnDocClick;
        document.addEventListener('click', closePickersOnDocClick);
    }

    static openTaskModal(taskId, containerEl) {
        const tasks = StorageEngine.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const members = StorageEngine.getMembers();
        const categories = StorageEngine.getCategories();

        // Remove any existing modal
        const existing = document.getElementById('task-detail-modal-root');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'task-detail-modal-root';
        modal.className = 'modal-backdrop active modal-backdrop-custom';
        document.body.style.overflow = 'hidden';
        modal.innerHTML = `
            <div class="modal-card" style="max-width: 540px; width: 92%; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
                <div class="modal-header d-flex justify-content-between align-items-center p-3.5" style="border-bottom: 1px solid var(--border-subtle);">
                    <div class="d-flex align-items-center gap-2">
                        <span style="font-size: 1.25rem;">📝</span>
                        <h4 class="m-0 font-bold" style="font-size: 1.1rem; color: var(--text-primary);">Aufgabe bearbeiten</h4>
                    </div>
                    <button type="button" class="btn-close-custom modal-close-btn" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);">✕</button>
                </div>
                
                <form id="task-edit-modal-form">
                    <div class="modal-body p-4 d-flex flex-column gap-3" style="max-height: 72vh; overflow-y: auto;">
                        <div>
                            <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Titel der Aufgabe</label>
                            <input type="text" id="modal-task-title" class="form-control" required value="${escapeHTML(task.title)}" placeholder="Aufgabentitel..." />
                        </div>

                        <div class="row g-2">
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Zugewiesen an</label>
                                <select id="modal-task-assignee" class="form-select form-select-sm">
                                    <option value="" ${!task.assigneeId ? 'selected' : ''}>Unzugewiesen</option>
                                    ${members.map(m => `
                                        <option value="${m.id}" ${task.assigneeId === m.id ? 'selected' : ''}>
                                            ${escapeHTML(m.name)} (${escapeHTML(m.role)})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Kategorie</label>
                                <select id="modal-task-category" class="form-select form-select-sm">
                                    ${categories.map(c => `
                                        <option value="${c.id}" ${task.categoryId === c.id ? 'selected' : ''}>
                                            ${c.icon ? c.icon + ' ' : ''}${escapeHTML(c.name)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="row g-2">
                            <div class="col-4">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Status</label>
                                <select id="modal-task-status" class="form-select form-select-sm">
                                    <option value="offen" ${task.status === 'offen' ? 'selected' : ''}>⏳ Offen</option>
                                    <option value="in_bearbeitung" ${task.status === 'in_bearbeitung' ? 'selected' : ''}>🔄 In Arbeit</option>
                                    <option value="erledigt" ${task.status === 'erledigt' ? 'selected' : ''}>✅ Erledigt</option>
                                </select>
                            </div>
                            <div class="col-4">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Priorität</label>
                                <select id="modal-task-priority" class="form-select form-select-sm">
                                    <option value="hoch" ${task.priority === 'hoch' ? 'selected' : ''}>🔴 Hoch</option>
                                    <option value="mittel" ${task.priority === 'mittel' ? 'selected' : ''}>🟡 Mittel</option>
                                    <option value="niedrig" ${task.priority === 'niedrig' ? 'selected' : ''}>🟢 Niedrig</option>
                                </select>
                            </div>
                            <div class="col-4">
                                <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Fälligkeit</label>
                                <input type="date" id="modal-task-duedate" class="form-control form-control-sm" value="${task.dueDate || ''}" />
                            </div>
                        </div>

                        <div>
                            <label class="form-label small mb-1" style="color: var(--text-secondary); font-weight: 700;">Beschreibung / Notizen</label>
                            <textarea id="modal-task-desc" class="form-control form-control-sm" rows="3" placeholder="Zusätzliche Notizen zur Aufgabe...">${escapeHTML(task.description || '')}</textarea>
                        </div>
                    </div>

                    <div class="modal-footer p-3 d-flex justify-content-between align-items-center" style="border-top: 1px solid var(--border-subtle); background: #f8fafc;">
                        <button type="button" id="modal-task-delete-btn" class="btn btn-sm text-danger" style="background: none; border: none; font-weight: 600; cursor: pointer;">
                            🗑️ Löschen
                        </button>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-ghost modal-close-btn">Abbrechen</button>
                            <button type="submit" class="btn btn-sm btn-donezo-primary font-bold">💾 Speichern</button>
                        </div>
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
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Delete handler
        modal.querySelector('#modal-task-delete-btn').addEventListener('click', () => {
            if (confirm('Aufgabe wirklich löschen?')) {
                StorageEngine.markTaskDeleted(taskId);
                const currentTasks = StorageEngine.getTasks();
                const updated = currentTasks.filter(t => t.id !== taskId);
                StorageEngine.saveTasks(updated);
                closeModal();
                this.render(containerEl);
            }
        });

        // Save handler
        modal.querySelector('#task-edit-modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const currentTasks = StorageEngine.getTasks();
            const targetTask = currentTasks.find(t => t.id === taskId);
            if (targetTask) {
                targetTask.title = document.getElementById('modal-task-title').value.trim() || targetTask.title;
                targetTask.assigneeId = document.getElementById('modal-task-assignee').value;
                targetTask.categoryId = document.getElementById('modal-task-category').value;
                targetTask.status = document.getElementById('modal-task-status').value;
                targetTask.priority = document.getElementById('modal-task-priority').value;
                targetTask.dueDate = document.getElementById('modal-task-duedate').value;
                targetTask.description = document.getElementById('modal-task-desc').value.trim();

                StorageEngine.saveTasks(currentTasks);
                closeModal();
                this.render(containerEl);
            }
        });
    }

    /**
     * Confirmation Modal for Deleting All Completed Tasks
     */
    static openDeleteCompletedModal(containerEl) {
        const allTasks = StorageEngine.getTasks();
        const completedTasks = allTasks.filter(t => t.status === 'erledigt');
        const members = StorageEngine.getMembers();
        const categories = StorageEngine.getCategories();

        const existing = document.getElementById('delete-completed-modal-root');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'delete-completed-modal-root';
        modal.className = 'modal-backdrop active modal-backdrop-custom';
        document.body.style.overflow = 'hidden';

        if (completedTasks.length === 0) {
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 460px; width: 92%; border-radius: 18px; overflow: hidden; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
                    <div class="modal-header d-flex justify-content-between align-items-center p-3.5" style="border-bottom: 1px solid var(--border-subtle);">
                        <div class="d-flex align-items-center gap-2">
                            <span style="font-size: 1.25rem;">🗑️</span>
                            <h4 class="m-0 font-bold" style="font-size: 1.1rem; color: var(--text-primary);">Erledigte Aufgaben löschen</h4>
                        </div>
                        <button type="button" class="btn-close-custom modal-close-btn" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);">✕</button>
                    </div>
                    <div class="modal-body p-4 text-center">
                        <div style="font-size: 3rem; margin-bottom: 0.75rem;">🎉</div>
                        <h4 style="color: var(--text-primary); font-weight: 800; margin-bottom: 0.5rem; font-size: 1.2rem;">Keine erledigten Aufgaben</h4>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin: 0 auto; max-width: 340px;">
                            Aktuell gibt es keine Aufgaben mit dem Status „Erledigt“, die gelöscht werden könnten.
                        </p>
                    </div>
                    <div class="modal-footer p-3 d-flex justify-content-end" style="border-top: 1px solid var(--border-subtle); background: #f8fafc;">
                        <button type="button" class="btn btn-sm btn-donezo-primary modal-close-btn" style="padding: 0.5rem 1.25rem; font-weight: 700; border-radius: 10px;">Verstanden</button>
                    </div>
                </div>
            `;
        } else {
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 580px; width: 92%; border-radius: 18px; overflow: hidden; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.18);">
                    <div class="modal-header d-flex justify-content-between align-items-center p-3.5" style="border-bottom: 1px solid #fee2e2; background: #fef2f2;">
                        <div class="d-flex align-items-center gap-2">
                            <span style="font-size: 1.3rem;">⚠️</span>
                            <h4 class="m-0 font-bold" style="font-size: 1.1rem; color: #991b1b;">Erledigte Aufgaben löschen?</h4>
                        </div>
                        <button type="button" class="btn-close-custom modal-close-btn" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #991b1b;">✕</button>
                    </div>

                    <div class="modal-body p-4">
                        <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.5; margin-bottom: 1rem;">
                            Möchten Sie die folgenden <strong style="color: #dc2626;">${completedTasks.length} erledigten Aufgaben</strong> wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                        </p>

                        <div class="completed-tasks-preview-list" style="max-height: 270px; overflow-y: auto; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.5rem;">
                            ${completedTasks.map(t => {
                                const assignee = members.find(m => m.id === t.assigneeId) || { name: 'Allgemein', avatar: '👥', color: '#10b981' };
                                const cat = categories.find(c => c.id === t.categoryId) || { name: 'Allgemein', icon: '📋' };
                                return `
                                    <div class="d-flex align-items-center justify-content-between p-2.5" style="background: #ffffff; border: 1px solid var(--border-subtle); border-radius: 8px;">
                                        <div class="d-flex align-items-center gap-2.5 overflow-hidden" style="flex: 1; min-width: 0;">
                                            <span style="font-size: 1.15rem; flex-shrink: 0;">✅</span>
                                            <div class="overflow-hidden" style="min-width: 0;">
                                                <div class="text-truncate" style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary); text-decoration: line-through;">
                                                    ${escapeHTML(t.title)}
                                                </div>
                                                <div class="d-flex align-items-center gap-2 mt-0.5" style="font-size: 0.75rem; color: var(--text-muted);">
                                                    <span class="text-truncate">${assignee.avatar} ${escapeHTML(assignee.name)}</span>
                                                    <span>•</span>
                                                    <span class="text-truncate">${cat.icon} ${escapeHTML(cat.name)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span class="badge" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: 12px; white-space: nowrap; margin-left: 8px;">Erledigt</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div class="modal-footer p-3.5 d-flex justify-content-between align-items-center" style="border-top: 1px solid var(--border-subtle); background: #f8fafc;">
                        <button type="button" class="btn btn-sm btn-ghost modal-close-btn" style="font-weight: 600;">Abbrechen</button>
                        <button type="button" class="btn btn-sm btn-danger font-bold" id="confirm-delete-completed-btn" style="padding: 0.55rem 1.15rem; border-radius: 10px; background: #dc2626; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);">
                            🗑️ Alle ${completedTasks.length} Aufgaben löschen
                        </button>
                    </div>
                </div>
            `;
        }

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.querySelectorAll('.modal-close-btn').forEach(b => b.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('#confirm-delete-completed-btn')?.addEventListener('click', () => {
            const currentTasks = StorageEngine.getTasks();
            const completed = currentTasks.filter(t => t.status === 'erledigt');
            completed.forEach(t => StorageEngine.markTaskDeleted(t.id));
            const remaining = currentTasks.filter(t => t.status !== 'erledigt');
            StorageEngine.saveTasks(remaining);
            closeModal();
            this.render(containerEl);
        });
    }
}

