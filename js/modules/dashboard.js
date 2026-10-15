/**
 * Donezo Executive Dashboard Module
 * High-Contrast Light SaaS Aesthetic with 4 Stat Cards, Pill Bar Chart,
 * Meeting Reminder, Team Collaboration List, Arc Progress Gauge, and Dark Tracker Card.
 */
import { StorageEngine, escapeHTML } from '../storage.js';
import { VaultGuard } from './vault.js';
import { TasksModule } from './tasks.js';

export class DashboardModule {
    static render(containerEl, onFilterMemberClick) {
        const tasks = StorageEngine.getTasks() || [];
        const members = StorageEngine.getMembers() || [];
        const finances = StorageEngine.getFinances() || [];
        const isVaultUnlocked = VaultGuard.isUnlockedSync();

        const isUserAdmin = StorageEngine.isAdminOrSuperUser();
        const currentUserId = StorageEngine.getCurrentUserId();
        const displayTasks = isUserAdmin 
            ? tasks 
            : tasks.filter(t => (Array.isArray(t.assigneeIds) && t.assigneeIds.includes(currentUserId)) || t.assigneeId === currentUserId);

        // Calculate statistics based on view permission
        const totalTasks = displayTasks.length;
        const completedTasks = displayTasks.filter(t => t && t.status === 'erledigt').length;
        const inProgressTasks = displayTasks.filter(t => t && t.status === 'in_bearbeitung').length;
        const openTasks = displayTasks.filter(t => t && t.status === 'offen').length;
        const globalPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Calculate finances
        const totalEinnahmen = finances.filter(f => f && f.type === 'einnahme').reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
        const totalAusgaben = finances.filter(f => f && f.type === 'ausgabe').reduce((sum, f) => sum + Math.abs(Number(f.amount) || 0), 0);
        const kassenstand = totalEinnahmen - totalAusgaben;

        // User profile and greeting information
        const loggedInUser = StorageEngine.getLoggedInUser();
        const firstName = (loggedInUser?.name || 'Vorstand').split(' ')[0];
        const hour = new Date().getHours();
        const greeting = hour < 11 ? 'Guten Morgen' : (hour < 18 ? 'Guten Tag' : 'Guten Abend');
        const todayDateStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const roleLabel = isUserAdmin 
            ? (loggedInUser?.systemRole === 'superuser' ? '👑 Superuser' : '⭐ Vorstand') 
            : `👤 ${escapeHTML(loggedInUser?.role || 'Mitglied')}`;

        // Top 4 Priority Tasks for Quick List
        const topTasks = displayTasks.slice(0, 4);

        containerEl.innerHTML = `
            <div class="donezo-dashboard-wrapper">
                <!-- Page Header & Executive Hero Welcome -->
                <div class="donezo-page-header">
                    <div class="donezo-header-text">
                        <div class="hero-date-badge">
                            <span>📅 ${todayDateStr}</span>
                            <span class="hero-role-pill">${roleLabel}</span>
                        </div>
                        <h1 class="hero-welcome-title">${greeting}, ${escapeHTML(firstName)}! 👋</h1>
                        <p class="hero-welcome-subtitle">${isUserAdmin ? 'Zentrale Übersicht für alle Aktivitäten, Termine und Aufgaben der Vorstandschaft.' : 'Deine persönliche Übersicht über alle an dich zugewiesenen Aufgaben & Termine.'}</p>
                    </div>
                    <div class="donezo-header-actions">
                        <button class="btn btn-donezo-primary" id="donezo-add-task-btn" title="Neue Aufgabe erstellen">
                            <span>➕</span> <span>Neue Aufgabe</span>
                        </button>
                        <button class="btn btn-donezo-outline" id="donezo-quick-minutes-btn" title="Sitzungsprotokoll öffnen">
                            <span>🎙️</span> <span>Sitzungsprotokoll</span>
                        </button>
                    </div>
                </div>

                <!-- 1. Top Stats Row (4 Columns matching Donezo) -->
                <div class="donezo-stats-row">
                    <!-- Hero Dark Green Stat Card -->
                    <div class="donezo-stat-hero" id="dash-stat-total" title="Zu Aufgaben wechseln">
                        <div class="stat-top">
                            <div style="display: flex; align-items: center; gap: 0.45rem;">
                                <span style="font-size: 1.15rem;">📋</span>
                                <span class="stat-label">${isUserAdmin ? 'Gesamte Aufgaben' : 'Meine Aufgaben'}</span>
                            </div>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${totalTasks}</div>
                        <div class="stat-pill">${isUserAdmin ? 'Alle Vorstands-To-Dos' : 'Dir zugewiesen'}</div>
                    </div>

                    <!-- White Card 2: Ended Projects -->
                    <div class="donezo-stat-card stat-card-completed" id="dash-stat-completed" title="Zu erledigten Aufgaben wechseln">
                        <div class="stat-top">
                            <div style="display: flex; align-items: center; gap: 0.45rem;">
                                <span style="font-size: 1.15rem;">✅</span>
                                <span class="stat-label">${isUserAdmin ? 'Erledigte To-Dos' : 'Meine Erledigten'}</span>
                            </div>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${completedTasks}</div>
                        <div class="stat-pill stat-pill-success">${globalPercentage}% abgeschlossen</div>
                    </div>

                    <!-- White Card 3: Running Projects -->
                    <div class="donezo-stat-card stat-card-inprogress" id="dash-stat-inprogress" title="Zu Aufgaben in Bearbeitung wechseln">
                        <div class="stat-top">
                            <div style="display: flex; align-items: center; gap: 0.45rem;">
                                <span style="font-size: 1.15rem;">🔄</span>
                                <span class="stat-label">In Bearbeitung</span>
                            </div>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${inProgressTasks}</div>
                        <div class="stat-pill stat-pill-warning">Laufende Projekte</div>
                    </div>

                    <!-- White Card 4: Pending / Urgent -->
                    <div class="donezo-stat-card stat-card-urgent" id="dash-stat-open" title="Zu offenen & dringenden Aufgaben wechseln">
                        <div class="stat-top">
                            <div style="display: flex; align-items: center; gap: 0.45rem;">
                                <span style="font-size: 1.15rem;">⚡</span>
                                <span class="stat-label">Offen & Dringend</span>
                            </div>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${openTasks}</div>
                        <div class="stat-pill ${openTasks === 0 ? 'stat-pill-success' : 'stat-pill-danger'}">${openTasks === 0 ? 'Alles erledigt 🎉' : 'Erfordert Aktion'}</div>
                    </div>
                </div>

                <!-- 2. Middle Row (Gesamtfortschritt Arc Meter, Reminders, Quick Tasks) -->
                <div class="donezo-grid-row">
                    <!-- Column 1: Project Progress (Semi-Circle Arc Meter) - Replaces Bar Chart -->
                    <div class="donezo-card" id="dash-card-progress" style="cursor: pointer;" title="Zur Aufgabenübersicht wechseln">
                        <div class="donezo-card-header">
                            <h3 class="donezo-card-title">Gesamtfortschritt</h3>
                            <span class="badge badge-neutral">${completedTasks}/${totalTasks} Aufgaben</span>
                        </div>

                        <div class="donezo-arc-container">
                            <div class="arc-svg-wrap">
                                <svg viewBox="0 0 100 60" width="180" height="100">
                                    <!-- Background Arc -->
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e5e7eb" stroke-width="12" stroke-linecap="round" />
                                    <!-- Foreground Progress Arc -->
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#10b981" stroke-width="12" stroke-linecap="round"
                                          stroke-dasharray="125.66"
                                          stroke-dashoffset="${(125.66 - (125.66 * globalPercentage) / 100).toFixed(2)}" />
                                </svg>
                                <div class="arc-center-text">
                                    <div class="arc-percentage">${globalPercentage}%</div>
                                    <div class="arc-sub">Erledigt</div>
                                </div>
                            </div>

                            <div class="arc-legend">
                                <div class="legend-item">
                                    <span class="legend-dot" style="background: #10b981;"></span>
                                    <span>Erledigt (${completedTasks})</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background: #f59e0b;"></span>
                                    <span>In Arbeit (${inProgressTasks})</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background: #9ca3af;"></span>
                                    <span>Offen (${openTasks})</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Reminders Card -->
                    <div class="donezo-card d-flex flex-column justify-content-between">
                        <div>
                            <div class="donezo-card-header">
                                <h3 class="donezo-card-title">Erinnerung</h3>
                                <span class="badge badge-success">Bevorstehend</span>
                            </div>

                            <div class="donezo-reminder-box">
                                <h4 class="donezo-reminder-title">Vorstandssitzung im LJ-Heim</h4>
                                <div class="donezo-reminder-time">📅 Diesen Freitag: 20:00 Uhr - 22:30 Uhr</div>
                            </div>
                        </div>

                        <button class="btn btn-donezo-primary w-100" id="donezo-start-meeting-btn">
                            🎙️ Sitzungsprotokoll öffnen
                        </button>
                    </div>

                    <!-- Column 3: Quick Tasks / Projects -->
                    <div class="donezo-card" id="dash-card-important-tasks" style="cursor: pointer;" title="Wichtige Aufgaben der nächsten 2 Wochen anzeigen">
                        <div class="donezo-card-header">
                            <h3 class="donezo-card-title">Wichtige To-Dos</h3>
                            <button class="btn btn-sm btn-ghost" id="donezo-view-all-tasks-btn" title="Alle Aufgaben der nächsten 2 Wochen anzeigen">⏱️ ≤ 14 Tage</button>
                        </div>

                        <div class="donezo-tasks-list">
                            ${topTasks.length === 0 ? `
                                <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted);">
                                    <div style="font-size: 1.8rem; margin-bottom: 0.35rem;">🎉</div>
                                    <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">Keine offenen To-Dos</div>
                                    <div style="font-size: 0.78rem; margin-top: 0.2rem;">Alle anstehenden Aufgaben wurden erfolgreich erledigt.</div>
                                </div>
                            ` : topTasks.map((t, idx) => {
                                const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
                                const dotColor = colors[idx % colors.length];
                                const isDone = t.status === 'erledigt';
                                const inProg = t.status === 'in_bearbeitung';
                                const pillClass = isDone ? 'pill-completed' : (inProg ? 'pill-progress' : 'pill-pending');
                                const pillText = isDone ? '✅ Erledigt' : (inProg ? '🔄 In Arbeit' : '📋 Offen');

                                return `
                                    <div class="donezo-task-row" data-task-id="${t.id}" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;" title="Aufgabe öffnen: ${escapeHTML(t.title)}">
                                        <div style="display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0;">
                                            <div class="task-dot" style="background: ${dotColor}; flex-shrink: 0;"></div>
                                            <div class="donezo-task-info" style="min-width: 0;">
                                                <span class="title ${isDone ? 'text-decoration-line-through text-muted' : ''}" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(t.title)}</span>
                                                <span class="due">Fällig: ${t.dueDate || 'Keine Frist'}</span>
                                            </div>
                                        </div>
                                        <div class="dash-task-status-wrapper" style="position: relative; flex-shrink: 0;">
                                            <button type="button" class="badge dash-inline-status-trigger donezo-status-pill ${pillClass}" data-task-id="${t.id}" title="Status ändern" style="border: 1px solid transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; font-weight: 800; font-size: 0.72rem; padding: 0.2rem 0.55rem; transition: all 0.15s ease;">
                                                <span>${pillText}</span>
                                                <span style="font-size: 0.65rem; opacity: 0.75;">▾</span>
                                            </button>
                                            <div class="task-inline-picker-menu hidden" id="dash-status-menu-${t.id}" style="right: 0; left: auto; min-width: 155px; text-align: left;">
                                                <div style="padding: 0.35rem 0.55rem 0.4rem; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); text-transform: uppercase;">
                                                    📊 Status wählen
                                                </div>
                                                <div class="task-inline-picker-item dash-status-item ${t.status === 'offen' ? 'active' : ''}" data-task-id="${t.id}" data-status="offen">
                                                    <span>📋 Offen</span>
                                                    ${t.status === 'offen' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                                </div>
                                                <div class="task-inline-picker-item dash-status-item ${t.status === 'in_bearbeitung' ? 'active' : ''}" data-task-id="${t.id}" data-status="in_bearbeitung">
                                                    <span>🔄 In Arbeit</span>
                                                    ${t.status === 'in_bearbeitung' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                                </div>
                                                <div class="task-inline-picker-item dash-status-item ${t.status === 'erledigt' ? 'active' : ''}" data-task-id="${t.id}" data-status="erledigt">
                                                    <span>✅ Erledigt</span>
                                                    ${t.status === 'erledigt' ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- 3. Bottom Row (2 Columns: Team Collaboration & Finance Widget) -->
                <div class="donezo-grid-row-2">
                    <!-- Column 1: Team Collaboration (Board Members) -->
                    <div class="donezo-card">
                        <div class="donezo-card-header">
                            <h3 class="donezo-card-title">Vorstandschaft (${members.length})</h3>
                            <button class="btn btn-sm btn-ghost" id="donezo-settings-members-btn">⚙️ Verwalten</button>
                        </div>

                        <div class="donezo-team-list">
                            ${members.slice(0, 6).map(m => {
                                const memberTasks = tasks.filter(t => (Array.isArray(t.assigneeIds) && t.assigneeIds.includes(m.id)) || t.assigneeId === m.id);
                                const isDone = memberTasks.length > 0 && memberTasks.every(t => t.status === 'erledigt');
                                const inProg = memberTasks.some(t => t.status === 'in_bearbeitung');
                                const pillClass = isDone ? 'pill-completed' : (inProg ? 'pill-progress' : 'pill-pending');
                                const pillText = isDone ? 'Erledigt' : (inProg ? 'In Arbeit' : 'Offen');

                                return `
                                    <div class="donezo-team-member" style="cursor: pointer;" data-member-id="${m.id}" title="Klicken, um Aufgaben für ${escapeHTML(m.name)} im Overlay zu verwalten">
                                        <div class="member-left">
                                            <div class="member-avatar-circle" style="background: ${m.color}15; color: ${m.color};">
                                                ${m.avatar}
                                            </div>
                                            <div class="member-meta">
                                                <span class="name">${escapeHTML(m.name)}</span>
                                                <span class="role">${escapeHTML(m.role)}</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <span class="donezo-status-pill ${pillClass}">${pillText}</span>
                                            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">(${memberTasks.length})</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Column 2: Donezo Dark Card (Kassenstand & Zeiterfassung) -->
                    <div class="donezo-dark-widget ${!isVaultUnlocked ? 'vault-locked-card' : ''}" id="dashboard-finance-card" style="cursor: pointer;" title="${isVaultUnlocked ? 'Kassenbuch öffnen' : 'Mit Master-PIN entsperren'}">
                        <div>
                            <div class="dark-widget-title d-flex align-items-center gap-1.5">
                                <span>${isVaultUnlocked ? '💰' : '🔒'}</span>
                                <span>Kassenstand & Finanzen</span>
                            </div>
                            <div class="dark-widget-time" style="${!isVaultUnlocked ? 'letter-spacing: 4px; font-family: monospace; opacity: 0.85;' : ''}">
                                ${isVaultUnlocked ? kassenstand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '•••••• €'}
                            </div>
                            <div style="color: ${isVaultUnlocked ? '#4ade80' : 'rgba(255, 255, 255, 0.75)'}; font-size: 0.82rem; margin-top: 0.4rem; font-weight: 600;">
                                ${isVaultUnlocked ? '🟢 Entsperrt (Kassenstand aktuell)' : '🔒 Gesperrter Bereich (PIN erforderlich)'}
                            </div>
                        </div>

                        <div class="dark-widget-controls">
                            <button class="widget-control-btn" id="open-finance-shortcut-btn" style="flex: 1; justify-content: center; text-align: center;" title="${isVaultUnlocked ? 'Kassenbuch öffnen' : 'Mit PIN entsperren'}">
                                ${isVaultUnlocked ? '📊 Kassenbuch öffnen' : '🔑 Bereich mit PIN entsperren'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerEl, onFilterMemberClick);
    }

    static bindEvents(containerEl, onFilterMemberClick) {
        // Add Task Shortcut
        containerEl.querySelector('#donezo-add-task-btn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks' } }));
        });

        // Quick Minutes Shortcut
        containerEl.querySelector('#donezo-quick-minutes-btn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'minutes' } }));
        });

        // Start Meeting / Open Minutes
        containerEl.querySelector('#donezo-start-meeting-btn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'minutes' } }));
        });

        // View All Important Tasks (Next 2 Weeks)
        const handleImportantTasksNav = (e) => {
            if (e.target.closest('.donezo-task-row')) return;
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterDue: 'next_2_weeks', filterStatus: 'all', filterMember: 'all', filterCategory: 'all' } }));
        };
        containerEl.querySelector('#donezo-view-all-tasks-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterDue: 'next_2_weeks', filterStatus: 'all', filterMember: 'all', filterCategory: 'all' } }));
        });
        containerEl.querySelector('#dash-card-important-tasks')?.addEventListener('click', handleImportantTasksNav);

        // Settings Members Shortcut
        containerEl.querySelector('#donezo-settings-members-btn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'settings' } }));
        });

        // Finance Shortcut
        containerEl.querySelector('#dashboard-finance-card')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'finance' } }));
        });
        containerEl.querySelector('#open-finance-shortcut-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'finance' } }));
        });

        // Stat Card Click Linkages - reset other filters so only the chosen status is shown
        containerEl.querySelector('#dash-stat-total')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterStatus: 'all', filterDue: 'all', filterMember: 'all', filterCategory: 'all' } }));
        });
        containerEl.querySelector('#dash-stat-completed')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterStatus: 'erledigt', filterDue: 'all', filterMember: 'all', filterCategory: 'all' } }));
        });
        containerEl.querySelector('#dash-stat-inprogress')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterStatus: 'in_bearbeitung', filterDue: 'all', filterMember: 'all', filterCategory: 'all' } }));
        });
        containerEl.querySelector('#dash-stat-open')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterStatus: 'offen', filterDue: 'all', filterMember: 'all', filterCategory: 'all' } }));
        });

        // Arc Progress Card Linkage
        containerEl.querySelector('#dash-card-progress')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterStatus: 'all', filterDue: 'all', filterMember: 'all', filterCategory: 'all' } }));
        });

        // Inline Status Picker on Dashboard
        containerEl.querySelectorAll('.dash-inline-status-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = trigger.dataset.taskId;
                const menu = containerEl.querySelector(`#dash-status-menu-${taskId}`);
                containerEl.querySelectorAll('.dash-task-status-wrapper .task-inline-picker-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                if (menu) menu.classList.toggle('hidden');
            });
        });

        containerEl.querySelectorAll('.dash-status-item[data-status]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = item.dataset.taskId;
                const newStatus = item.dataset.status;
                const allTasks = StorageEngine.getTasks();
                const target = allTasks.find(t => t.id === taskId);
                if (target && newStatus) {
                    target.status = newStatus;
                    StorageEngine.saveTasks(allTasks);
                    DashboardModule.render(containerEl, onFilterMemberClick);
                }
            });
        });

        // Close dashboard pickers on click outside
        const closeDashPickers = (e) => {
            if (!e.target.closest('.dash-task-status-wrapper')) {
                containerEl.querySelectorAll('.dash-task-status-wrapper .task-inline-picker-menu').forEach(m => m.classList.add('hidden'));
            }
        };
        if (containerEl._dashDocPickerHandler) {
            document.removeEventListener('click', containerEl._dashDocPickerHandler);
        }
        containerEl._dashDocPickerHandler = closeDashPickers;
        document.addEventListener('click', closeDashPickers);

        // Quick Task row clicks (opens modal, but ignores if clicking status trigger or menu)
        containerEl.querySelectorAll('.donezo-task-row[data-task-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.dash-task-status-wrapper')) return;
                const taskId = row.dataset.taskId;
                window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', openTaskId: taskId } }));
            });
        });

        // Member Click: Opens person tasks overlay modal directly (per user request)
        containerEl.querySelectorAll('.donezo-team-member[data-member-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                const memberId = e.currentTarget.dataset.memberId;
                if (memberId) {
                    TasksModule.openPersonTasksModal(memberId, () => DashboardModule.render(containerEl, onFilterMemberClick));
                }
            });
        });
    }
}
