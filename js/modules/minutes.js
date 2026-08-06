/**
 * Meeting Minutes, Audio Recorder, Conversation Tracking & Fact-Based Auto-Protocol Generator
 */
import { StorageEngine, escapeHTML } from '../storage.js';
import { AudioRecorderEngine } from './recorder.js';

let activeRecorder = null;
let recordingStartTimestampStr = null;

export class MinutesModule {
    static formatStartTimestamp(d = new Date()) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year}_${hours}:${minutes}`;
    }

    static render(containerEl) {
        const minutes = StorageEngine.getMinutes();
        const members = StorageEngine.getMembers();

        containerEl.innerHTML = `
            <div class="minutes-wrapper">
                <div class="section-banner minutes-banner">
                    <div class="banner-title">
                        <h2>🎙️ Sitzungen, Audio-Aufnahme & Fakten-Protokolle</h2>
                        <p>Nimmt Sitzungen auf und generiert hochkompakte Stichpunkt-Fakten ohne Smalltalk.</p>
                    </div>
                </div>

                <!-- Recorder Widget Bar -->
                <div class="card-glow recorder-widget">
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
                        <button class="btn btn-primary btn-glow" id="start-rec-btn">🎙️ Aufnahme starten</button>
                        <button class="btn btn-danger btn-glow hidden" id="stop-rec-btn">⏹️ Aufnahme beenden</button>
                    </div>
                </div>

                <!-- Live Transcript Container -->
                <div class="card-glow transcript-box hidden" id="live-transcript-box">
                    <div class="transcript-header">
                        <h4>✨ Live-Transkription & Fakten-Erkennung</h4>
                        <span class="badge badge-neutral" id="trans-word-count">0 Wörter</span>
                    </div>
                    <textarea id="transcript-textarea" class="form-control" rows="5" placeholder="Gesprochener Text erscheint hier..."></textarea>
                    
                    <div class="transcript-actions mt-3">
                        <button class="btn btn-emerald btn-glow" id="generate-protocol-btn">
                            ⚡ Fakten-Stichpunkte & Protokoll generieren
                        </button>
                    </div>
                </div>

                <!-- Protocol Archive -->
                <div class="toolbar-row mt-4 mb-3">
                    <h3>📚 Archivierte Sitzungsprotokolle (${minutes.length})</h3>
                </div>

                <div class="minutes-list">
                    ${minutes.length === 0 ? `
                        <div class="empty-column-placeholder">Noch keine Sitzungsprotokolle vorhanden.</div>
                    ` : minutes.map(m => `
                        <div class="minute-card card-glow mb-4" style="border-left: 4px solid #10b981; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                            <div class="minute-header d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h3 class="minute-title" style="color: #34d399; font-size: 1.25rem; font-weight: 800; font-family: monospace; letter-spacing: 0.03em;">
                                        📁 ${escapeHTML(m.title)}
                                    </h3>
                                    <span class="minute-meta text-muted small">📅 Datum: ${m.date} | 📍 ${escapeHTML(m.location || 'Landjugendheim Scheuring')}</span>
                                </div>
                                <button class="btn btn-sm btn-ghost danger-text delete-minute-btn" data-id="${m.id}" title="Löschen">🗑️</button>
                            </div>

                            <!-- Bullet Point Summary -->
                            <div class="bullets-box card-glow-sm mt-3">
                                <h5>📝 Wichtige Fakten & Beschlüsse (Stichpunkte):</h5>
                                <ul class="bullet-list">
                                    ${(m.bullets || [m.summary]).map(b => `<li>${escapeHTML(b)}</li>`).join('')}
                                </ul>
                            </div>

                            <!-- Speaker Conversation Tracking -->
                            ${m.speakerMap && m.speakerMap.length > 0 ? `
                                <div class="speaker-tracking-box mt-3">
                                    <h5>💬 Wichtige Aussagen nach Personen:</h5>
                                    <div class="speaker-dialogue-list">
                                        ${m.speakerMap.map(s => {
                                            const matchedMember = members.find(mem => mem.name.toLowerCase().includes(s.speaker.toLowerCase())) || { color: '#3b82f6', avatar: '👤' };
                                            return `
                                                <div class="dialogue-chip mb-2" style="border-left: 3px solid ${matchedMember.color}">
                                                    <strong style="color: ${matchedMember.color}">${matchedMember.avatar} ${escapeHTML(s.speaker)}:</strong>
                                                    <span>${escapeHTML(s.text)}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Decisions -->
                            ${m.decisions && m.decisions.length > 0 ? `
                                <div class="decisions-box mt-3">
                                    <h5>⚖️ Gefasste Beschlüsse:</h5>
                                    <ul>
                                        ${m.decisions.map(d => `<li>${escapeHTML(d)}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.bindEvents(containerEl, minutes, members);
    }

    static bindEvents(containerEl, minutes, members) {
        const startBtn = document.getElementById('start-rec-btn');
        const stopBtn = document.getElementById('stop-rec-btn');
        const timerEl = document.getElementById('recording-timer');
        const waveVis = document.getElementById('wave-vis');
        const micBadge = document.getElementById('mic-badge');
        const liveBox = document.getElementById('live-transcript-box');
        const textarea = document.getElementById('transcript-textarea');
        const wordCountEl = document.getElementById('trans-word-count');

        startBtn?.addEventListener('click', async () => {
            liveBox.classList.remove('hidden');
            textarea.value = '';
            recordingStartTimestampStr = this.formatStartTimestamp(new Date());

            activeRecorder = new AudioRecorderEngine(
                (text) => {
                    textarea.value = text;
                    const words = text.trim().split(/\s+/).filter(Boolean).length;
                    wordCountEl.textContent = `${words} Wörter`;
                },
                (status) => {
                    if (status.isRecording) {
                        startBtn.classList.add('hidden');
                        stopBtn.classList.remove('hidden');
                        waveVis.classList.add('active');
                        micBadge.textContent = '🔴 Aufnehmen...';
                        micBadge.style.background = '#ef4444';
                        timerEl.textContent = AudioRecorderEngine.formatSeconds(status.seconds);
                    } else {
                        startBtn.classList.remove('hidden');
                        stopBtn.classList.add('hidden');
                        waveVis.classList.remove('active');
                        micBadge.textContent = '🎙️ Bereit';
                        micBadge.style.background = '#22c55e';
                    }
                }
            );

            await activeRecorder.startRecording();
        });

        stopBtn?.addEventListener('click', async () => {
            if (activeRecorder) {
                await activeRecorder.stopRecording();
                alert('🎉 Aufnahme beendet! Das Transkript steht bereit zur Fakten-Stichpunktgenerierung.');
            }
        });

        document.getElementById('generate-protocol-btn')?.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (!text) {
                alert('Bitte sprich zuerst Text ein oder tippe Notizen in das Feld.');
                return;
            }
            const stamp = recordingStartTimestampStr || this.formatStartTimestamp(new Date());
            this.generateBulletProtocol(text, stamp, containerEl, members);
        });

        containerEl.querySelectorAll('.delete-minute-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Sitzungsprotokoll aus dem Archiv löschen?')) {
                    const updated = minutes.filter(m => m.id !== id);
                    StorageEngine.saveMinutes(updated);
                    this.render(containerEl);
                }
            });
        });
    }

    /**
     * Fact-based bullet point summarizer (filters greetings, chit-chat, and extracts actionable facts)
     */
    static generateBulletProtocol(rawText, timestampStr, containerEl, members) {
        const titleStr = `Zusammenfassung_${timestampStr}`;
        const datePart = timestampStr.split('_')[0] || new Date().toISOString().slice(0, 10);
        const rawSentences = rawText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

        // Phrases to ignore completely (greetings, pleasantries, chit-chat)
        const ignorePhrases = [
            'hallo', 'herzlich willkommen', 'willkommen zur', 'begrüße euch', 'danke dass ihr',
            'schön dass alle', 'wir fangen', 'los gehts', 'guten abend', 'servus', 'moin'
        ];

        const bullets = [];
        const decisions = [];
        const speakerMap = [];

        rawSentences.forEach(sentence => {
            const lower = sentence.toLowerCase();

            // Skip greetings and chit-chat
            if (ignorePhrases.some(p => lower.includes(p)) && sentence.length < 50) {
                return;
            }

            // Check if sentence mentions a member
            members.forEach(mem => {
                const firstName = mem.name.split(' ')[0].toLowerCase();
                if (lower.includes(firstName)) {
                    speakerMap.push({
                        speaker: mem.name,
                        text: sentence
                    });
                }
            });

            // Categorize as decision or fact bullet
            if (lower.includes('beschluss') || lower.includes('einstimmig') || lower.includes('beschlossen') || lower.includes('genehmigt')) {
                decisions.push(sentence);
            } else {
                // Simplify & clean sentence to concise bullet
                let cleaned = sentence;
                if (lower.includes('klo') || lower.includes('wagen') || lower.includes('toilette')) {
                    cleaned = `📌 ${sentence}`;
                } else if (lower.includes('brauche') || lower.includes('benötigt') || lower.includes('helfer')) {
                    cleaned = `📌 ${sentence}`;
                } else {
                    cleaned = `• ${sentence}`;
                }
                bullets.push(cleaned);
            }
        });

        if (bullets.length === 0) bullets.push(`• Wichtige Beschlüsse und Vorstands-Fakten vom ${datePart}`);
        if (decisions.length === 0) decisions.push('Sitzung ordnungsgemäß durchgeführt.');

        // Save generated minute with dedicated box title: Zusammenfassung_DD.MM.YYYY_HH:mm
        const minutes = StorageEngine.getMinutes();
        minutes.unshift({
            id: 'm_doc_' + Date.now(),
            title: titleStr,
            date: datePart,
            location: 'Landjugendheim Scheuring',
            summary: rawText,
            bullets: bullets,
            speakerMap: speakerMap,
            decisions: decisions
        });
        StorageEngine.saveMinutes(minutes);

        // Reset recording start timestamp for future recordings
        recordingStartTimestampStr = null;

        alert(`✨ Erfolg! Eigene Zusammenfassungs-Box '${titleStr}' wurde erstellt und archiviert!`);
        this.render(containerEl);
    }
}
