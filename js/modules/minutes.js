/**
 * Meeting Minutes, Audio Recorder, Conversation Tracking & AI-Powered Meeting Copilot (Teams-Grade)
 */
import { StorageEngine, escapeHTML } from "../storage.js";
import { AudioRecorderEngine } from "./recorder.js";
import { FileReaderEngine } from "./file-reader.js";
import { ProtocolParser } from "./protocol-parser.js";

let activeRecorder = null;
let recordingStartTimestampStr = null;

export class MinutesModule {
    static formatStartTimestamp(d = new Date()) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${day}.${month}.${year}_${hours}:${minutes}`;
    }

    static render(containerEl) {
        const minutes = StorageEngine.getMinutes() || [];
        const members = StorageEngine.getMembers() || [];
        const aiConfig = StorageEngine.getAiConfig();

        containerEl.innerHTML = `
            <div class="minutes-wrapper">
                <!-- Recorder Widget Bar -->
                <div class="card-glow recorder-widget mb-3">
                    <div class="recorder-left">
                        <div class="mic-status-badge" id="mic-badge">🎙️ Bereit</div>
                        <div class="recorder-title-block">
                            <h3 id="rec-status-title">Vorstandssitzung aufnehmen</h3>
                            <p id="rec-status-desc">Erfasst Stimmen und filtert Begrüßungen & Smalltalk automatisch heraus.</p>
                        </div>
                    </div>

                    <div class="recorder-center">
                        <div class="timer-display" id="recording-timer">00:00</div>
                        <div class="wave-visualizer" id="wave-vis">
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                    </div>

                    <div class="recorder-right">
                        <button class="btn btn-donezo-primary" id="start-rec-btn" style="padding: 0.65rem 1.35rem; font-weight: 700; font-size: 0.92rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.5rem; white-space: nowrap;">🎙️ Aufnahme starten</button>
                        <button class="btn btn-danger hidden" id="stop-rec-btn" style="padding: 0.65rem 1.35rem; font-weight: 700; font-size: 0.92rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.5rem; white-space: nowrap;">⏹️ Aufnahme beenden</button>
                    </div>
                </div>

                <!-- AI Copilot Status & Inline Quick-Setup Card -->
                <div class="card-glow p-3 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style="background: #ffffff; border-radius: 14px; border: 1px solid var(--border-subtle); border-left: 5px solid #3b82f6;">
                    <div class="d-flex align-items-center gap-2.5">
                        <span style="font-size: 1.5rem;">🤖</span>
                        <div>
                            <div class="d-flex align-items-center gap-2 flex-wrap">
                                <strong style="font-size: 1rem; color: var(--text-primary);">KI-Sitzungs-Copilot (Teams-Modus)</strong>
                                ${aiConfig.geminiKey || aiConfig.openaiKey
                                    ? `<span class="badge" style="background: #ecfdf5; color: #047857; font-weight: 800; font-size: 0.76rem; padding: 3px 8px; border-radius: 6px;">🟢 ${aiConfig.provider === 'openai' ? 'OpenAI GPT-4o' : 'Google Gemini'} Key aktiv</span>`
                                    : `<span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.76rem; padding: 3px 8px; border-radius: 6px;">🟡 Kein API-Schlüssel hinterlegt</span>`}
                            </div>
                            <p class="text-muted m-0 small">Automatische Gliederung in TOPs, Management-Summary & 1-Klick-Aufgabenübernahme</p>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <button type="button" class="btn btn-sm btn-secondary" id="toggle-minutes-ai-config-btn" style="border-radius: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                            ⚙️ API-Schlüssel verwalten
                        </button>
                        <button type="button" class="btn btn-sm btn-ghost" id="open-text-transcript-btn" style="border-radius: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
                            📝 Notizen eingeben
                        </button>
                    </div>
                </div>

                <!-- Collapsible Inline AI Config Panel -->
                <div class="card-glow p-4 mb-3 hidden" id="minutes-inline-ai-config-panel" style="background: #f8fafc; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: var(--shadow-donezo);">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex align-items-center gap-2">
                            <span style="font-size: 1.25rem;">🔑</span>
                            <h4 class="m-0" style="font-weight: 800; font-size: 1.05rem; color: #0f172a;">
                                Google Gemini API-Schlüssel direkt einrichten
                            </h4>
                        </div>
                        <button type="button" class="btn btn-sm btn-ghost" id="close-minutes-ai-config-btn" style="font-size: 1.1rem; line-height: 1;">✕</button>
                    </div>
                    <p style="font-size: 0.85rem; color: #475569; line-height: 1.5; margin-bottom: 1rem;">
                        Für die kostenlose KI-Zusammenfassung auf Microsoft Teams-Niveau wird ein kostenloser Google Gemini API-Key benötigt (dauert ca. 30 Sekunden im Google AI Studio).
                    </p>
                    <div class="d-flex flex-column gap-3" style="max-width: 680px;">
                        <div>
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin: 0;">Google Gemini API-Key (beginnt mit AIzaSy...):</label>
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; font-weight: 700; color: #0284c7; text-decoration: underline;">
                                    ↗ 1. Kostenlosen Key bei Google AI Studio holen
                                </a>
                            </div>
                            <div style="position: relative;">
                                <input type="password" id="minutes-gemini-key-input" class="form-control" placeholder="AIzaSy..." value="${escapeHTML(aiConfig.geminiKey || '')}" style="font-family: monospace; font-size: 0.88rem; padding-right: 36px;">
                                <button type="button" class="btn btn-sm btn-ghost" id="minutes-toggle-key-vis" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); z-index: 5;">👁️</button>
                            </div>
                        </div>
                        <div class="d-flex gap-2 align-items-center flex-wrap">
                            <button type="button" class="btn btn-donezo-primary" id="minutes-save-ai-key-btn" style="font-weight: 700; border-radius: 10px; padding: 0.55rem 1.35rem;">
                                💾 Schlüssel speichern
                            </button>
                            <button type="button" class="btn btn-secondary" id="minutes-test-ai-key-btn" style="font-weight: 600; border-radius: 10px; padding: 0.55rem 1.15rem;">
                                ⚡ Verbindung testen
                            </button>
                        </div>
                        <div id="minutes-ai-test-feedback" style="font-size: 0.86rem; font-weight: 700; margin-top: 0.25rem;"></div>
                    </div>
                </div>

                <!-- Live Transcript Container -->
                <div class="card-glow transcript-box hidden" id="live-transcript-box">
                    <div class="transcript-header d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div>
                            <h4 class="m-0" style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary);">🎙️ Sitzungstranskript & Notizen</h4>
                            <p class="text-muted m-0 small">Gesprochener Text oder Notizen für die intelligente Gesprächszusammenfassung</p>
                        </div>
                        <span class="badge badge-neutral" id="trans-word-count">0 Wörter</span>
                    </div>
                    <textarea id="transcript-textarea" class="form-control" rows="6" placeholder="Gesprochener Text erscheint hier automatisch beim Sprechen. Du kannst Notizen auch manuell eingeben oder einfügen..."></textarea>
                    
                    <div class="transcript-actions mt-3 d-flex flex-wrap gap-2 align-items-center justify-content-between">
                        <div class="d-flex flex-wrap gap-2 align-items-center">
                            <button class="btn btn-donezo-primary btn-glow" id="generate-ai-protocol-btn" style="font-weight: 700; padding: 0.65rem 1.35rem; display: inline-flex; align-items: center; gap: 0.5rem; border-radius: 12px;">
                                🤖 Intelligente KI-Zusammenfassung generieren (Teams-Modus)
                            </button>
                            <button class="btn btn-secondary" id="copy-copilot-prompt-btn" style="font-weight: 600; padding: 0.65rem 1rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.4rem;">
                                📋 Für Copilot / ChatGPT kopieren
                            </button>
                            <button class="btn btn-ghost" id="manual-paste-protocol-btn" style="font-weight: 600; padding: 0.65rem 1rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.4rem;">
                                📥 Zusammenfassung einfügen
                            </button>
                        </div>
                        <button class="btn btn-ghost text-muted small" id="generate-fast-rule-btn" style="font-size: 0.8rem;" title="Generiert einfache Stichpunkte lokal ohne KI">
                            ⚡ Lokale Stichpunkte
                        </button>
                    </div>
                    <div id="ai-generating-status" class="hidden mt-2 p-3 rounded" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-weight: 600; font-size: 0.88rem;">
                        ⏳ <strong>KI-Copilot analysiert die Vorstandssitzung:</strong> Erkenne Themen, Tagesordnungspunkte, Aufgaben und Fakten...
                    </div>
                </div>

                <!-- Protocol Archive -->
                <div class="toolbar-row mt-4 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h3 class="m-0" style="font-weight: 800; font-size: 1.25rem;">📚 Archivierte Sitzungsprotokolle (${minutes.length})</h3>
                </div>

                <div class="minutes-list">
                    ${minutes.length === 0 ? `
                        <div class="empty-column-placeholder">Noch keine Sitzungsprotokolle vorhanden. Starte oben eine Aufnahme oder füge Notizen ein.</div>
                    ` : minutes.map(m => `
                        <div class="minute-card mb-4" style="border-left: 5px solid ${m.isAiGenerated || m.executiveSummary ? "#3b82f6" : "#10b981"}; background: #ffffff; border-radius: 14px; box-shadow: var(--shadow-donezo); padding: 1.25rem; border: 1px solid var(--border-subtle);">
                            <div class="minute-header d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                <div>
                                    <div class="d-flex align-items-center gap-2 flex-wrap">
                                        <h3 class="minute-title" style="color: var(--text-primary); font-size: 1.15rem; font-weight: 800; margin: 0;">
                                            📁 ${escapeHTML(m.title)}
                                        </h3>
                                        ${(m.isAiGenerated || m.executiveSummary) ? `<span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #1d4ed8; font-weight: 800; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px;">✨ Teams/Copilot KI-Protokoll</span>` : ""}
                                    </div>
                                    <span class="minute-meta text-muted small">📅 Datum: ${escapeHTML(m.date || "")} | 📍 ${escapeHTML(m.location || "Landjugendheim Scheuring")}</span>
                                </div>
                                <div class="d-flex align-items-center gap-1">
                                    <button class="btn btn-sm btn-ghost copy-minute-text-btn" data-id="${m.id}" title="Protokoll als Text in Zwischenablage kopieren" style="font-size: 0.8rem; font-weight: 600;">📋 Kopieren</button>
                                    <button class="btn btn-sm btn-ghost danger-text delete-minute-btn" data-id="${m.id}" title="Löschen">🗑️</button>
                                </div>
                            </div>

                            <!-- Executive Summary (Teams Style) -->
                            ${m.executiveSummary ? `
                                <div class="executive-summary-box mb-3" style="background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 10px; padding: 0.9rem 1.15rem;">
                                    <h5 style="color: #0369a1; font-weight: 800; font-size: 0.88rem; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.03em;">
                                        📌 Vorstands-Zusammenfassung (Management Summary):
                                    </h5>
                                    <p style="margin: 0; color: #0c4a6e; font-size: 0.92rem; line-height: 1.55; font-weight: 500;">
                                        ${escapeHTML(m.executiveSummary)}
                                    </p>
                                </div>
                            ` : ""}

                            <!-- Tagesordnungspunkte (TOPs) with Context -->
                            ${Array.isArray(m.tops) && m.tops.length > 0 ? `
                                <div class="tops-section mb-3">
                                    <h5 style="color: #1e293b; font-weight: 800; font-size: 0.92rem; margin: 0 0 0.6rem 0;">
                                        📑 Tagesordnungspunkte (TOPs) mit Kontext:
                                    </h5>
                                    <div class="d-flex flex-column gap-2">
                                        ${m.tops.map(top => `
                                            <div class="top-item-card p-3" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                                                <div class="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-1">
                                                    <h6 style="color: #0f172a; font-weight: 800; font-size: 0.92rem; margin: 0;">${escapeHTML(top.topic || top.title || "TOP")}</h6>
                                                    ${top.category ? `<span class="badge badge-neutral" style="font-size: 0.72rem; text-transform: capitalize;">${escapeHTML(top.category)}</span>` : ""}
                                                </div>
                                                <p style="margin: 0; color: #334155; font-size: 0.88rem; line-height: 1.5;">${escapeHTML(top.summary || top.context || "")}</p>
                                            </div>
                                        `).join("")}
                                    </div>
                                </div>
                            ` : ""}

                            <!-- Tasks with 1-Click Adoption into Tasks Module -->
                            ${Array.isArray(m.tasks) && m.tasks.length > 0 ? `
                                <div class="tasks-section mb-3" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1rem;">
                                    <h5 style="color: #166534; font-weight: 800; font-size: 0.92rem; margin: 0 0 0.6rem 0;">
                                        📌 Aufgaben & Arbeitsaufträge (${m.tasks.length}):
                                    </h5>
                                    <div class="d-flex flex-column gap-2">
                                        ${m.tasks.map((t) => `
                                            <div class="d-flex align-items-center justify-content-between p-2 rounded flex-wrap gap-2" style="background: #ffffff; border: 1px solid #dcfce7;">
                                                <div style="flex: 1; min-width: 220px;">
                                                    <strong style="color: #14532d; font-size: 0.9rem;">${escapeHTML(t.title)}</strong>
                                                    <div class="text-muted small mt-0.5" style="font-size: 0.78rem;">
                                                        👤 <strong>${escapeHTML(t.assigneeName || "Vorstand")}</strong>
                                                        ${t.dueDate ? ` | 📅 bis ${escapeHTML(t.dueDate)}` : ""}
                                                        ${t.priority ? ` | ⚡ Priorität: ${escapeHTML(t.priority)}` : ""}
                                                        ${t.details ? ` | <i>${escapeHTML(t.details)}</i>` : ""}
                                                    </div>
                                                </div>
                                                <button class="btn btn-sm btn-emerald adopt-task-action-btn" 
                                                    data-task-title="${escapeHTML(t.title)}"
                                                    data-task-assignee-id="${escapeHTML(t.assigneeId || "")}"
                                                    data-task-assignee-name="${escapeHTML(t.assigneeName || "")}"
                                                    data-task-due="${escapeHTML(t.dueDate || "")}"
                                                    data-task-prio="${escapeHTML(t.priority || "mittel")}"
                                                    data-task-details="${escapeHTML(t.details || "")}"
                                                    style="font-size: 0.8rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 8px;">
                                                    ➕ In Aufgabenliste übernehmen
                                                </button>
                                            </div>
                                        `).join("")}
                                    </div>
                                </div>
                            ` : ""}

                            <!-- Decisions -->
                            ${Array.isArray(m.decisions) && m.decisions.length > 0 ? `
                                <div class="mb-3" style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 0.9rem 1.15rem;">
                                    <h5 style="color: #6b21a8; font-weight: 800; font-size: 0.88rem; margin: 0 0 0.4rem 0;">⚖️ Beschlüsse & Vereinbarungen:</h5>
                                    <ul style="margin: 0; padding-left: 1.25rem; color: #581c87; font-size: 0.88rem; font-weight: 600;">
                                        ${m.decisions.map(d => `<li style="margin-bottom: 0.25rem;">${escapeHTML(d)}</li>`).join("")}
                                    </ul>
                                </div>
                            ` : ""}

                            <!-- Numbers, Facts & Statistics -->
                            ${Array.isArray(m.numbersAndFacts) && m.numbersAndFacts.length > 0 ? `
                                <div class="mb-3" style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 0.9rem 1.15rem;">
                                    <h5 style="color: #b45309; font-weight: 800; font-size: 0.88rem; margin: 0 0 0.4rem 0;">📊 Zahlen, Fakten & Anmeldungen:</h5>
                                    <ul style="margin: 0; padding-left: 1.25rem; color: #78350f; font-size: 0.88rem;">
                                        ${m.numbersAndFacts.map(f => `<li style="margin-bottom: 0.25rem;">${escapeHTML(f)}</li>`).join("")}
                                    </ul>
                                </div>
                            ` : ""}

                            <!-- Fallback for Legacy Categorized Bullets or Summary -->
                            ${!m.executiveSummary && !m.tops && m.categorizedBullets ? `
                                <div class="bullets-box mt-3" style="background: #ffffff; border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1.15rem;">
                                    ${m.categorizedBullets.decisions && m.categorizedBullets.decisions.length > 0 ? `
                                        <div class="mb-3">
                                            <h5 style="color: #6b21a8; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.45rem;">⚖️ Beschlüsse & Entscheidungen:</h5>
                                            <ul class="bullet-list" style="padding-left: 1.25rem; margin: 0; color: #1e293b; font-size: 0.88rem;">
                                                ${m.categorizedBullets.decisions.map(d => `<li style="margin-bottom: 0.25rem; font-weight: 700;">${escapeHTML(d)}</li>`).join("")}
                                            </ul>
                                        </div>
                                    ` : ""}

                                    ${m.categorizedBullets.tasks && m.categorizedBullets.tasks.length > 0 ? `
                                        <div class="mb-3">
                                            <h5 style="color: #047857; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.45rem;">📌 Aufgaben & Zuständigkeiten:</h5>
                                            <ul class="bullet-list" style="padding-left: 1.25rem; margin: 0; color: #1e293b; font-size: 0.88rem;">
                                                ${m.categorizedBullets.tasks.map(t => `<li style="margin-bottom: 0.25rem;">${escapeHTML(t)}</li>`).join("")}
                                            </ul>
                                        </div>
                                    ` : ""}

                                    ${m.categorizedBullets.finances && m.categorizedBullets.finances.length > 0 ? `
                                        <div class="mb-3">
                                            <h5 style="color: #b45309; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.45rem;">💰 Kasse & Finanzen:</h5>
                                            <ul class="bullet-list" style="padding-left: 1.25rem; margin: 0; color: #1e293b; font-size: 0.88rem;">
                                                ${m.categorizedBullets.finances.map(f => `<li style="margin-bottom: 0.25rem;">${escapeHTML(f)}</li>`).join("")}
                                            </ul>
                                        </div>
                                    ` : ""}

                                    ${m.categorizedBullets.topics && m.categorizedBullets.topics.length > 0 ? `
                                        <div>
                                            <h5 style="color: #1e40af; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.45rem;">💬 Besprochene Punkte & Termine:</h5>
                                            <ul class="bullet-list" style="padding-left: 1.25rem; margin: 0; color: #1e293b; font-size: 0.88rem;">
                                                ${m.categorizedBullets.topics.map(top => `<li style="margin-bottom: 0.25rem;">${escapeHTML(top)}</li>`).join("")}
                                            </ul>
                                        </div>
                                    ` : ""}
                                </div>
                            ` : (!m.executiveSummary && !m.tops && (m.bullets || m.summary) ? `
                                <div class="bullets-box mt-3" style="background: #ffffff; border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1.15rem;">
                                    <h5 style="color: var(--text-secondary); font-weight: 800; font-size: 0.88rem; margin-bottom: 0.5rem;">📝 Stichpunkte:</h5>
                                    <ul class="bullet-list" style="padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
                                        ${(m.bullets || [m.summary]).map(b => `<li style="margin-bottom: 0.25rem;">${escapeHTML(b)}</li>`).join("")}
                                    </ul>
                                </div>
                            ` : "")}
                        </div>
                    `).join("")}
                </div>
            </div>
        `;

        this.bindEvents(containerEl, minutes, members);
    }

    static bindEvents(containerEl, minutes, members) {
        const startBtn = document.getElementById("start-rec-btn");
        const stopBtn = document.getElementById("stop-rec-btn");
        const timerEl = document.getElementById("recording-timer");
        const waveVis = document.getElementById("wave-vis");
        const micBadge = document.getElementById("mic-badge");
        const liveBox = document.getElementById("live-transcript-box");
        const textarea = document.getElementById("transcript-textarea");
        const wordCountEl = document.getElementById("trans-word-count");
        const aiStatusEl = document.getElementById("ai-generating-status");

        // 0. Inline AI Copilot Quick-Setup Handlers
        const toggleAiConfigBtn = document.getElementById("toggle-minutes-ai-config-btn");
        const closeAiConfigBtn = document.getElementById("close-minutes-ai-config-btn");
        const inlineAiPanel = document.getElementById("minutes-inline-ai-config-panel");
        const openTranscriptBtn = document.getElementById("open-text-transcript-btn");
        const geminiKeyInput = document.getElementById("minutes-gemini-key-input");
        const toggleKeyVisBtn = document.getElementById("minutes-toggle-key-vis");
        const saveKeyBtn = document.getElementById("minutes-save-ai-key-btn");
        const testKeyBtn = document.getElementById("minutes-test-ai-key-btn");
        const testFeedbackEl = document.getElementById("minutes-ai-test-feedback");

        toggleAiConfigBtn?.addEventListener("click", () => {
            if (inlineAiPanel) {
                inlineAiPanel.classList.toggle("hidden");
                if (!inlineAiPanel.classList.contains("hidden")) {
                    geminiKeyInput?.focus();
                }
            }
        });

        closeAiConfigBtn?.addEventListener("click", () => {
            if (inlineAiPanel) inlineAiPanel.classList.add("hidden");
        });

        openTranscriptBtn?.addEventListener("click", () => {
            if (liveBox) {
                liveBox.classList.remove("hidden");
                textarea?.focus();
            }
        });

        toggleKeyVisBtn?.addEventListener("click", () => {
            if (geminiKeyInput) {
                if (geminiKeyInput.type === "password") {
                    geminiKeyInput.type = "text";
                    toggleKeyVisBtn.textContent = "🙈";
                } else {
                    geminiKeyInput.type = "password";
                    toggleKeyVisBtn.textContent = "👁️";
                }
            }
        });

        saveKeyBtn?.addEventListener("click", () => {
            const rawKey = geminiKeyInput?.value || "";
            const newKey = rawKey.trim().replace(/^["']|["']$/g, '').replace(/^key\s*=\s*/i, '').trim();
            if (geminiKeyInput) geminiKeyInput.value = newKey;
            StorageEngine.saveAiConfig({ provider: "gemini", geminiKey: newKey });
            if (testFeedbackEl) {
                testFeedbackEl.innerHTML = '<span style="color: #10b981;">✅ Gemini API-Schlüssel erfolgreich gespeichert!</span>';
                setTimeout(() => {
                    this.render(containerEl);
                }, 1000);
            } else {
                this.render(containerEl);
            }
        });

        testKeyBtn?.addEventListener("click", async () => {
            const rawKey = geminiKeyInput?.value || "";
            const key = rawKey.trim().replace(/^["']|["']$/g, '').replace(/^key\s*=\s*/i, '').trim();
            if (geminiKeyInput) geminiKeyInput.value = key;
            if (!key) {
                if (testFeedbackEl) testFeedbackEl.innerHTML = '<span style="color: #ef4444;">⚠️ Bitte zuerst einen Key eingeben.</span>';
                return;
            }
            if (testFeedbackEl) testFeedbackEl.innerHTML = '⏳ <i>Verbindung wird getestet (Sende Test-Anfrage an Google Gemini)...</i>';
            try {
                const resp = await fetch("/api/ai-summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transcript: "Test der Verbindung zur Landjugend Scheuring für die Sitzungszusammenfassung.",
                        members: members,
                        apiKey: key,
                        provider: "gemini"
                    })
                });
                const data = await resp.json();
                if (data.success && data.protocol) {
                    StorageEngine.saveAiConfig({ provider: "gemini", geminiKey: key });
                    if (testFeedbackEl) testFeedbackEl.innerHTML = '<span style="color: #10b981;">🎉 Verbindung erfolgreich! Google Gemini antwortet blitzschnell und ist einsatzbereit.</span>';
                    setTimeout(() => {
                        this.render(containerEl);
                    }, 1500);
                } else {
                    if (testFeedbackEl) testFeedbackEl.innerHTML = `<span style="color: #ef4444;">❌ Fehler: ${data.message || data.error || "Verbindung fehlgeschlagen"}</span>`;
                }
            } catch (err) {
                if (testFeedbackEl) testFeedbackEl.innerHTML = `<span style="color: #ef4444;">❌ Netzwerkfehler: ${err.message}</span>`;
            }
        });

        // 1. Audio Recording Handlers
        startBtn?.addEventListener("click", async () => {
            liveBox.classList.remove("hidden");
            textarea.value = "";
            recordingStartTimestampStr = this.formatStartTimestamp(new Date());

            activeRecorder = new AudioRecorderEngine(
                (text) => {
                    textarea.value = text;
                    const words = text.trim().split(/\s+/).filter(Boolean).length;
                    wordCountEl.textContent = `${words} Wörter`;
                },
                (status) => {
                    if (status.isRecording) {
                        startBtn.classList.add("hidden");
                        stopBtn.classList.remove("hidden");
                        waveVis.classList.add("active");
                        micBadge.textContent = "🔴 Aufnehmen...";
                        micBadge.style.background = "#ef4444";
                        timerEl.textContent = AudioRecorderEngine.formatSeconds(status.seconds);
                    } else {
                        startBtn.classList.remove("hidden");
                        stopBtn.classList.add("hidden");
                        waveVis.classList.remove("active");
                        micBadge.textContent = "🎙️ Bereit";
                        micBadge.style.background = "#22c55e";
                    }
                }
            );

            await activeRecorder.startRecording();
        });

        stopBtn?.addEventListener("click", async () => {
            if (activeRecorder) {
                await activeRecorder.stopRecording();
                alert("🎉 Aufnahme beendet! Das Transkript steht bereit. Klicke jetzt auf 'Intelligente KI-Zusammenfassung generieren', um das Protokoll zu erstellen.");
            }
        });

        // 2. Word Count on Typing
        textarea?.addEventListener("input", () => {
            const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
            if (wordCountEl) wordCountEl.textContent = `${words} Wörter`;
        });

        // 3. AI Protocol Generator (Teams/Copilot-Modus)
        const generateAiBtn = document.getElementById("generate-ai-protocol-btn");
        generateAiBtn?.addEventListener("click", async () => {
            const text = textarea.value.trim();
            if (!text) {
                alert("Bitte sprich zuerst Text ein oder tippe/kopiere Notizen in das Feld.");
                return;
            }

            const aiConfig = StorageEngine.getAiConfig();
            const provider = aiConfig.provider || "gemini";
            const rawKey = provider === "openai" ? aiConfig.openaiKey : aiConfig.geminiKey;
            const key = (rawKey || "").trim().replace(/^["']|["']$/g, '').replace(/^key\s*=\s*/i, '').trim();

            generateAiBtn.disabled = true;
            generateAiBtn.innerHTML = "⏳ <i>KI analysiert Sitzung...</i>";
            if (aiStatusEl) aiStatusEl.classList.remove("hidden");

            try {
                const resp = await fetch("/api/ai-summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transcript: text,
                        members: members,
                        apiKey: key,
                        provider: provider
                    })
                });

                const data = await resp.json();

                if (!resp.ok || !data.success) {
                    if (data.error === "NO_API_KEY") {
                        this.openNoKeyModal(text, members, containerEl);
                    } else {
                        alert(`⚠️ Fehler bei der KI-Generierung: ${data.message || data.error || "Unbekannter Fehler"}`);
                    }
                    return;
                }

                // Success: save structured AI minute
                const p = data.protocol;
                const stamp = recordingStartTimestampStr || this.formatStartTimestamp(new Date());
                const datePart = stamp.split("_")[0] || new Date().toISOString().slice(0, 10);

                const newMinute = {
                    id: "m_ai_" + Date.now(),
                    title: p.title || `Zusammenfassung_${stamp}`,
                    date: datePart,
                    location: "Landjugendheim Scheuring",
                    isAiGenerated: true,
                    executiveSummary: p.executiveSummary || "",
                    tops: Array.isArray(p.tops) ? p.tops : [],
                    tasks: Array.isArray(p.tasks) ? p.tasks : [],
                    decisions: Array.isArray(p.decisions) ? p.decisions : [],
                    numbersAndFacts: Array.isArray(p.numbersAndFacts) ? p.numbersAndFacts : [],
                    nextSteps: Array.isArray(p.nextSteps) ? p.nextSteps : [],
                    rawTranscript: text
                };

                const currentMinutes = StorageEngine.getMinutes() || [];
                currentMinutes.unshift(newMinute);
                StorageEngine.saveMinutes(currentMinutes);

                recordingStartTimestampStr = null;
                alert("🎉 Hervorragend! Die intelligente KI-Zusammenfassung mit TOPs und Aufgaben wurde erfolgreich erstellt und archiviert!");
                this.render(containerEl);

            } catch (err) {
                console.error("AI Generation Network Error:", err);
                alert("❌ Netzwerkfehler beim Aufruf der KI-Schnittstelle: " + err.message);
            } finally {
                generateAiBtn.disabled = false;
                generateAiBtn.innerHTML = "🤖 Intelligente KI-Zusammenfassung generieren (Teams-Modus)";
                if (aiStatusEl) aiStatusEl.classList.add("hidden");
            }
        });

        // 4. Copilot / ChatGPT Prompt Copy Bridge
        document.getElementById("copy-copilot-prompt-btn")?.addEventListener("click", () => {
            const text = textarea.value.trim();
            if (!text) {
                alert("Bitte gib zuerst Text in das Transkript-Feld ein.");
                return;
            }

            const promptText = this.buildCopilotPrompt(text, members);
            navigator.clipboard.writeText(promptText).then(() => {
                if (confirm("✅ Perfekter Vorstands-Prompt wurde in die Zwischenablage kopiert!\n\nMöchtest du Microsoft Copilot jetzt in einem neuen Tab öffnen?")) {
                    window.open("https://copilot.microsoft.com", "_blank");
                }
            }).catch(() => {
                alert("Kopieren nicht unterstützt. Bitte markiere den Text manuell.");
            });
        });

        // 5. Manual Paste AI Summary Bridge
        document.getElementById("manual-paste-protocol-btn")?.addEventListener("click", () => {
            this.openPasteSummaryModal(containerEl, members);
        });

        // 6. Local Fast Rule Bullets (Offline Fallback)
        document.getElementById("generate-fast-rule-btn")?.addEventListener("click", () => {
            const text = textarea.value.trim();
            if (!text) {
                alert("Bitte sprich zuerst Text ein oder tippe Notizen in das Feld.");
                return;
            }
            const stamp = recordingStartTimestampStr || this.formatStartTimestamp(new Date());
            this.generateBulletProtocol(text, stamp, containerEl, members);
        });

        // 7. Interactive 1-Click Task Adoption into Task Module
        containerEl.querySelectorAll(".adopt-task-action-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetBtn = e.currentTarget;
                const title = targetBtn.dataset.taskTitle;
                const assigneeId = targetBtn.dataset.taskAssigneeId || "m1";
                const assigneeName = targetBtn.dataset.taskAssigneeName || "";
                const dueDate = targetBtn.dataset.taskDue || "";
                const priority = targetBtn.dataset.taskPrio || "mittel";
                const details = targetBtn.dataset.taskDetails || "";

                const newTask = StorageEngine.addTask({
                    title: title,
                    description: details ? `${details} (Zuständig laut Sitzung: ${assigneeName})` : `Zuständig laut Sitzung: ${assigneeName}`,
                    assigneeId: assigneeId,
                    assigneeIds: [assigneeId],
                    dueDate: dueDate,
                    priority: priority,
                    categoryId: "sitzung",
                    status: "open"
                });

                if (newTask) {
                    targetBtn.innerHTML = "✅ In Aufgabenliste übernommen";
                    targetBtn.classList.remove("btn-emerald");
                    targetBtn.classList.add("btn-secondary");
                    targetBtn.disabled = true;
                }
            });
        });

        // 8. Copy Minute Text
        containerEl.querySelectorAll(".copy-minute-text-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.dataset.id;
                const m = minutes.find(item => item.id === id);
                if (!m) return;

                let formatted = `📁 ${m.title}\n📅 Datum: ${m.date || ""} | 📍 ${m.location || "Landjugendheim Scheuring"}\n\n`;
                if (m.executiveSummary) {
                    formatted += `📌 VORSTANDS-ZUSAMMENFASSUNG:\n${m.executiveSummary}\n\n`;
                }
                if (Array.isArray(m.tops) && m.tops.length > 0) {
                    formatted += `📑 TAGESORDNUNGSPUNKTE:\n`;
                    m.tops.forEach(top => {
                        formatted += `- ${top.topic || "TOP"}: ${top.summary}\n`;
                    });
                    formatted += `\n`;
                }
                if (Array.isArray(m.tasks) && m.tasks.length > 0) {
                    formatted += `📌 AUFGABEN:\n`;
                    m.tasks.forEach(t => {
                        formatted += `• ${t.title} (${t.assigneeName || "Vorstand"}${t.dueDate ? `, Frist: ${t.dueDate}` : ""})\n`;
                    });
                    formatted += `\n`;
                }
                if (Array.isArray(m.decisions) && m.decisions.length > 0) {
                    formatted += `⚖️ BESCHLÜSSE:\n`;
                    m.decisions.forEach(d => {
                        formatted += `• ${d}\n`;
                    });
                    formatted += `\n`;
                }
                if (Array.isArray(m.numbersAndFacts) && m.numbersAndFacts.length > 0) {
                    formatted += `📊 ZAHLEN & FAKTEN:\n`;
                    m.numbersAndFacts.forEach(f => {
                        formatted += `• ${f}\n`;
                    });
                }

                navigator.clipboard.writeText(formatted).then(() => {
                    alert("📋 Vollständiges Protokoll in die Zwischenablage kopiert!");
                });
            });
        });

        // 9. Delete Minute
        containerEl.querySelectorAll(".delete-minute-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("Sitzungsprotokoll aus dem Archiv löschen?")) {
                    const updated = minutes.filter(m => m.id !== id);
                    StorageEngine.saveMinutes(updated);
                    this.render(containerEl);
                }
            });
        });
    }

    /**
     * Builds standard Copilot/ChatGPT prompt with club context
     */
    static buildCopilotPrompt(transcript, members) {
        const membersListStr = members.map(m => `- ${m.name || "Vorstand"} (${m.role || "Mitglied"})`).join("\n");
        return `Du bist der Sitzungs-Copilot der "Landjugend Scheuring". Bitte erstelle mir aus folgendem Transkript ein hochprofessionelles, strukturiertes Sitzungsprotokoll im Stil von Microsoft Teams Intelligent Recap.

VORSTANDSMITGLIEDER (inkl. Spitznamen: Mo = Moritz Kubik, Kiwi/Kili = Kilian Salai, Vali = Valentin Müllner, Linda/Schwaigerin = Linda Schweiger, Cassy = Cassandra Wunner):
${membersListStr}

STRUKTUR:
1. Vorstands-Zusammenfassung (Management Summary): 2-3 flüssige Sätze zum Gesamtinhalt und Kontext.
2. Tagesordnungspunkte (TOPs) mit inhaltlichem Kontext (z. B. TOP 1: Vorstandsausflug mit Frühstück, Aktivität, Fahrradtour und Abendessen).
3. Aufgaben & Action Items (mit Zuständigem und Frist).
4. Konkrete Zahlen & Fakten (z. B. 29 Kürbisse / Anmeldungen).
5. Beschlüsse.

TRANSKRIPT DER SITZUNG:
${transcript}`;
    }

    /**
     * Modal displayed when no API key is saved yet
     */
    static openNoKeyModal(transcript, members, containerEl) {
        const modal = document.createElement("div");
        modal.id = "no-key-modal";
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 1000000; background: rgba(15, 23, 42, 0.75);
            display: flex; align-items: center; justify-content: center; padding: 1.5rem;
        `;
        modal.innerHTML = `
            <div class="card-glow p-4" style="background: #ffffff; border-radius: 16px; max-width: 580px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span style="font-size: 1.6rem;">🤖</span>
                    <h3 class="m-0" style="font-weight: 800; font-size: 1.25rem; color: var(--text-primary);">
                        KI-Vorstands-Copilot aktivieren
                    </h3>
                </div>
                <p style="font-size: 0.9rem; line-height: 1.5; color: #475569; margin-bottom: 1.25rem;">
                    Um Zusammenfassungen, Tagesordnungspunkte und Aufgaben auf Microsoft Teams Niveau automatisch zu generieren, wird ein kostenloser <strong>Google Gemini API-Key</strong> benötigt (dauert ca. 30 Sekunden).
                </p>

                <div class="p-3 rounded mb-3" style="background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 0.85rem; color: #166534; line-height: 1.5;">
                    ✅ <strong>100% Kostenlos:</strong> Google Gemini 1.5 Flash bietet 15 Anfragen/Minute und 1.500 pro Tag dauerhaft kostenlos für Vereine.
                </div>

                <div class="d-flex flex-column gap-2">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="btn btn-donezo-primary" style="text-align: center; font-weight: 700; padding: 0.65rem;">
                        🔑 1. Kostenlosen Key bei Google AI Studio holen (30 Sek.) ↗
                    </a>
                    <button class="btn btn-secondary" id="modal-goto-settings-btn" style="font-weight: 600; padding: 0.65rem;">
                        ⚙️ 2. Key in Einstellungen der Vorstands-Zentrale eintragen
                    </button>
                    <button class="btn btn-ghost" id="modal-copy-prompt-btn" style="font-weight: 600; padding: 0.65rem;">
                        📋 Oder sofort mit Microsoft Copilot / ChatGPT kostenlos zusammenfassen
                    </button>
                    <button class="btn btn-ghost text-muted small mt-2" id="modal-close-no-key-btn">
                        Schließen
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#modal-close-no-key-btn")?.addEventListener("click", () => modal.remove());
        modal.querySelector("#modal-goto-settings-btn")?.addEventListener("click", () => {
            modal.remove();
            if (typeof window.switchTab === "function") {
                window.switchTab("settings");
            }
        });
        modal.querySelector("#modal-copy-prompt-btn")?.addEventListener("click", () => {
            modal.remove();
            const prompt = MinutesModule.buildCopilotPrompt(transcript, members);
            navigator.clipboard.writeText(prompt).then(() => {
                if (confirm("✅ Prompt kopiert! Möchtest du Microsoft Copilot jetzt in einem neuen Tab öffnen?")) {
                    window.open("https://copilot.microsoft.com", "_blank");
                }
            });
        });
    }

    /**
     * Modal to paste Copilot/ChatGPT generated protocol
     */
    static openPasteSummaryModal(containerEl, members) {
        const modal = document.createElement("div");
        modal.id = "paste-summary-modal";
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 1000000; background: rgba(15, 23, 42, 0.75);
            display: flex; align-items: center; justify-content: center; padding: 1.5rem;
        `;
        modal.innerHTML = `
            <div class="card-glow p-4" style="background: #ffffff; border-radius: 16px; max-width: 680px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <h3 class="m-0" style="font-weight: 800; font-size: 1.25rem; color: var(--text-primary);">
                        📥 Zusammenfassung aus Copilot/ChatGPT einfügen
                    </h3>
                    <button class="btn btn-sm btn-ghost" id="close-paste-modal-btn">✕</button>
                </div>
                <p class="text-muted small mb-3">Füge die generierte Zusammenfassung hier ein. Das System gliedert das Protokoll automatisch und archiviert es.</p>
                <textarea id="paste-summary-textarea" class="form-control" rows="10" placeholder="Füge hier die Antwort von Microsoft Copilot oder ChatGPT ein..."></textarea>
                <div class="d-flex justify-content-end gap-2 mt-3">
                    <button class="btn btn-ghost" id="cancel-paste-modal-btn">Abbrechen</button>
                    <button class="btn btn-donezo-primary" id="save-pasted-summary-btn" style="font-weight: 700;">💾 Als Protokoll archivieren</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector("#close-paste-modal-btn")?.addEventListener("click", () => modal.remove());
        modal.querySelector("#cancel-paste-modal-btn")?.addEventListener("click", () => modal.remove());

        modal.querySelector("#save-pasted-summary-btn")?.addEventListener("click", () => {
            const pasted = modal.querySelector("#paste-summary-textarea")?.value.trim();
            if (!pasted) {
                alert("Bitte füge zuerst Text ein.");
                return;
            }

            // Try to parse JSON if Copilot returned JSON
            let parsed = null;
            try {
                let clean = pasted.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
                parsed = JSON.parse(clean);
            } catch (e) {}

            const stamp = MinutesModule.formatStartTimestamp(new Date());
            const datePart = stamp.split("_")[0];
            const currentMinutes = StorageEngine.getMinutes() || [];

            if (parsed && typeof parsed === "object") {
                currentMinutes.unshift({
                    id: "m_ai_" + Date.now(),
                    title: parsed.title || `Zusammenfassung_${stamp}`,
                    date: datePart,
                    location: "Landjugendheim Scheuring",
                    isAiGenerated: true,
                    executiveSummary: parsed.executiveSummary || "",
                    tops: Array.isArray(parsed.tops) ? parsed.tops : [],
                    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
                    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
                    numbersAndFacts: Array.isArray(parsed.numbersAndFacts) ? parsed.numbersAndFacts : [],
                    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
                    rawTranscript: pasted
                });
            } else {
                // Parse text by headers/bullets
                const lines = pasted.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const tops = [];
                const tasks = [];
                const decisions = [];
                let execSummary = "";

                let currentSection = "summary";
                for (const line of lines) {
                    const lLower = line.toLowerCase();
                    if (lLower.includes("tagesordnung") || lLower.includes("top ")) {
                        currentSection = "tops";
                    } else if (lLower.includes("aufgabe") || lLower.includes("to-do") || lLower.includes("action")) {
                        currentSection = "tasks";
                    } else if (lLower.includes("beschluss") || lLower.includes("entscheidung")) {
                        currentSection = "decisions";
                    } else {
                        if (currentSection === "summary" && !execSummary && line.length > 20) {
                            execSummary = line;
                        } else if (currentSection === "tops") {
                            tops.push({ topic: "TOP", summary: line.replace(/^[•\-*\d.]+\s*/, "") });
                        } else if (currentSection === "tasks") {
                            tasks.push({ title: line.replace(/^[•\-*\d.]+\s*/, ""), assigneeName: "Vorstand" });
                        } else if (currentSection === "decisions") {
                            decisions.push(line.replace(/^[•\-*\d.]+\s*/, ""));
                        }
                    }
                }

                currentMinutes.unshift({
                    id: "m_ai_" + Date.now(),
                    title: `Zusammenfassung_${stamp}`,
                    date: datePart,
                    location: "Landjugendheim Scheuring",
                    isAiGenerated: true,
                    executiveSummary: execSummary || pasted.slice(0, 180) + "...",
                    tops: tops,
                    tasks: tasks,
                    decisions: decisions,
                    numbersAndFacts: [],
                    rawTranscript: pasted
                });
            }

            StorageEngine.saveMinutes(currentMinutes);
            modal.remove();
            alert("🎉 Zusammenfassung erfolgreich als Protokoll archiviert!");
            MinutesModule.render(containerEl);
        });
    }

    /**
     * Fallback bullet summarizer
     */
    static generateBulletProtocol(rawText, timestampStr, containerEl, members) {
        const titleStr = `Zusammenfassung_${timestampStr}`;
        const datePart = timestampStr.split("_")[0] || new Date().toISOString().slice(0, 10);

        const synthesized = ProtocolParser.synthesizeDecisionBullets(rawText, members);
        const { decisions, tasks, finances, topics, allBullets } = synthesized;

        const minutes = StorageEngine.getMinutes() || [];
        minutes.unshift({
            id: "m_doc_" + Date.now(),
            title: titleStr,
            date: datePart,
            location: "Landjugendheim Scheuring",
            summary: rawText,
            bullets: allBullets,
            categorizedBullets: {
                decisions,
                tasks,
                finances,
                topics
            },
            decisions: decisions
        });
        StorageEngine.saveMinutes(minutes);

        recordingStartTimestampStr = null;
        alert(`✨ Erfolg! Eigene Zusammenfassungs-Box "${titleStr}" mit Fakten- & Entscheidungs-Stichpunkten wurde erstellt und archiviert!`);
        this.render(containerEl);
    }
}
