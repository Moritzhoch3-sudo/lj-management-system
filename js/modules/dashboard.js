/**
 * Donezo Executive Dashboard Module
 * High-Contrast Light SaaS Aesthetic with 4 Stat Cards, Pill Bar Chart,
 * Meeting Reminder, Team Collaboration List, Arc Progress Gauge, and Dark Tracker Card.
 */
import { StorageEngine, escapeHTML } from '../storage.js';
import { VaultGuard } from './vault.js';

export class DashboardModule {
    static render(containerEl, onFilterMemberClick) {
        const tasks = StorageEngine.getTasks() || [];
        const members = StorageEngine.getMembers() || [];
        const finances = StorageEngine.getFinances() || [];
        const isVaultUnlocked = VaultGuard.isUnlockedSync();

        // Calculate statistics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t && t.status === 'erledigt').length;
        const inProgressTasks = tasks.filter(t => t && t.status === 'in_bearbeitung').length;
        const openTasks = tasks.filter(t => t && t.status === 'offen').length;
        const globalPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Calculate finances
        const totalEinnahmen = finances.filter(f => f && f.type === 'einnahme').reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
        const totalAusgaben = finances.filter(f => f && f.type === 'ausgabe').reduce((sum, f) => sum + Math.abs(Number(f.amount) || 0), 0);
        const kassenstand = totalEinnahmen - totalAusgaben;

        // Top 4 Priority Tasks for Quick List
        const topTasks = tasks.slice(0, 4);

        containerEl.innerHTML = `
            <div class="donezo-dashboard-wrapper">
                <!-- Page Header -->
                <div class="donezo-page-header">
                    <div class="donezo-header-text">
                        <h1>Dashboard</h1>
                        <p>Plane, priorisiere und verwalte die Landjugend Scheuring mit Leichtigkeit.</p>
                    </div>
                    <div class="donezo-header-actions">
                        <button class="btn btn-donezo-primary" id="donezo-add-task-btn">
                            ➕ Neue Aufgabe
                        </button>
                        <button class="btn btn-donezo-outline" id="donezo-export-data-btn">
                            📥 Daten Exportieren
                        </button>
                    </div>
                </div>

                <!-- 1. Top Stats Row (4 Columns matching Donezo) -->
                <div class="donezo-stats-row">
                    <!-- Hero Dark Green Stat Card -->
                    <div class="donezo-stat-hero" id="dash-stat-total" title="Zu allen Aufgaben wechseln">
                        <div class="stat-top">
                            <span class="stat-label">Gesamte Aufgaben</span>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${totalTasks}</div>
                        <div class="stat-pill">+3 neu diese Woche</div>
                    </div>

                    <!-- White Card 2: Ended Projects -->
                    <div class="donezo-stat-card" id="dash-stat-completed" title="Zu erledigten Aufgaben wechseln">
                        <div class="stat-top">
                            <span class="stat-label">Erledigte To-Dos</span>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${completedTasks}</div>
                        <div class="stat-pill">Erfolgreich abgeschlossen</div>
                    </div>

                    <!-- White Card 3: Running Projects -->
                    <div class="donezo-stat-card" id="dash-stat-inprogress" title="Zu Aufgaben in Bearbeitung wechseln">
                        <div class="stat-top">
                            <span class="stat-label">In Bearbeitung</span>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${inProgressTasks}</div>
                        <div class="stat-pill">Laufende Projekte</div>
                    </div>

                    <!-- White Card 4: Pending / Urgent -->
                    <div class="donezo-stat-card" id="dash-stat-open" title="Zu offenen & dringenden Aufgaben wechseln">
                        <div class="stat-top">
                            <span class="stat-label">Offen & Dringend</span>
                            <span class="donezo-arrow-badge">↗</span>
                        </div>
                        <div class="stat-number">${openTasks}</div>
                        <div class="stat-pill">Priorität Hoch</div>
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
                            ${topTasks.map((t, idx) => {
                                const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
                                const dotColor = colors[idx % colors.length];
                                return `
                                    <div class="donezo-task-row" data-task-id="${t.id}" style="cursor: pointer;" title="Aufgabe öffnen: ${escapeHTML(t.title)}">
                                        <div class="task-dot" style="background: ${dotColor};"></div>
                                        <div class="donezo-task-info">
                                            <span class="title">${escapeHTML(t.title)}</span>
                                            <span class="due">Fällig: ${t.dueDate || 'Keine Frist'}</span>
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
                                const memberTasks = tasks.filter(t => t.assigneeId === m.id);
                                const isDone = memberTasks.length > 0 && memberTasks.every(t => t.status === 'erledigt');
                                const inProg = memberTasks.some(t => t.status === 'in_bearbeitung');
                                const pillClass = isDone ? 'pill-completed' : (inProg ? 'pill-progress' : 'pill-pending');
                                const pillText = isDone ? 'Erledigt' : (inProg ? 'In Arbeit' : 'Offen');

                                return `
                                    <div class="donezo-team-member" style="cursor: pointer;" data-member-id="${m.id}">
                                        <div class="member-left">
                                            <div class="member-avatar-circle" style="background: ${m.color}15; color: ${m.color};">
                                                ${m.avatar}
                                            </div>
                                            <div class="member-meta">
                                                <span class="name">${escapeHTML(m.name)}</span>
                                                <span class="role">${escapeHTML(m.role)}</span>
                                            </div>
                                        </div>
                                        <span class="donezo-status-pill ${pillClass}">${pillText}</span>
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
                            <button class="widget-control-btn" id="open-finance-shortcut-btn" title="${isVaultUnlocked ? 'Kassenbuch öffnen' : 'Mit PIN entsperren'}">
                                ${isVaultUnlocked ? '📊 Kassenbuch' : '🔑 Entsperren'}
                            </button>
                            <button class="widget-control-btn" id="donezo-audio-shortcut-btn" title="Audio-Aufnahme starten">
                                🎙️ Audio
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

        // Export Data
        containerEl.querySelector('#donezo-export-data-btn')?.addEventListener('click', () => {
            StorageEngine.exportFullBackup();
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

        // Quick Task row clicks
        containerEl.querySelectorAll('.donezo-task-row[data-task-id]').forEach(row => {
            row.addEventListener('click', () => {
                const taskId = row.dataset.taskId;
                window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', openTaskId: taskId } }));
            });
        });

        // Member Click to filter in Tasks
        containerEl.querySelectorAll('.donezo-team-member[data-member-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                const memberId = e.currentTarget.dataset.memberId;
                if (onFilterMemberClick) {
                    onFilterMemberClick(memberId);
                } else {
                    window.dispatchEvent(new CustomEvent('nav-to-tab', { detail: { tab: 'tasks', filterMember: memberId } }));
                }
            });
        });
    }
}
