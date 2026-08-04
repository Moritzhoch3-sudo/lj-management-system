/**
 * Meeting Minutes, Audio Recorder, Conversation Tracking & Auto-Protocol Generator
 */
import { CATEGORIES } from '../data.js';
import { StorageEngine } from '../storage.js';
import { AudioRecorderEngine } from './recorder.js';

let activeRecorder = null;

export class MinutesModule {
    static render(containerEl) {
        const minutes = StorageEngine.getMinutes();
        const members = StorageEngine.getMembers();

        containerEl.innerHTML = `
            <div class="minutes-wrapper">
                <div class="section-banner minutes-banner">
                    <div class="banner-title">
                        <h2>🎙️ Sitzungen, Audio-Aufnahme & Gesprächs-Tracking</h2>
                        <p>Sitzung aufnehmen, Gespräche & Fragen nachverfolgen und stichpunktartige Protokolle generieren.</p>
                    </div>
                </div>

                <!-- Recorder Widget Bar -->
                <div class="card-glow recorder-widget">
                    <div class="recorder-left">
                        <div class="mic-status-badge" id="mic-badge">🎙️ Bereit</div>
                        <div class="recorder-title-block">
                            <h3 id="rec-status-title">Vorstandssitzung aufnehmen</h3>
                            <p id="rec-status-desc">Nimmt Stimmen auf und ordnet Fragen & Antworten automatisch Personen zu.</p>
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
                        <h4>✨ Live-Transkription & Gesprächserkennung</h4>
                        <span class="badge badge-neutral" id="trans-word-count">0 Wörter</span>
                    </div>
                    <textarea id="transcript-textarea" class="form-control" rows="5" placeholder="Sprecher & Text erscheinen hier in Echtzeit..."></textarea>
                    
                    <div class="transcript-actions mt-3">
                        <button class="btn btn-emerald btn-glow" id="generate-protocol-btn">
                            ⚡ Stichpunkt-Protokoll & Gesprächs-Verlauf generieren
                        </button>
                    </div>
                </div>

                <!-- Protocol Archive -->
                <div class="toolbar-row mt-4 mb-3">
                    <h3>📚 Archivierte Sitzungsprotokolle & Konversationen (${minutes.length})</h3>
                </div>

                <div class="minutes-list">
                    ${minutes.length === 0 ? `
                        <div class="empty-column-placeholder">Noch keine Sitzungsprotokolle vorhanden.</div>
                    ` : minutes.map(m => `
                        <div class="minute-card card-glow mb-4">
                            <div class="minute-header">
                                <div>
                                    <h3 class="minute-title">${m.title}</h3>
                                    <span class="minute-meta">📅 ${m.date} | 📍 ${m.location || 'Landjugendheim'}</span>
                                </div>
                                <button class="btn btn-sm btn-ghost danger-text delete-minute-btn" data-id="${m.id}">🗑️</button>
                            </div>

                            <!-- Bullet Point Summary -->
                            <div class="bullets-box card-glow-sm mt-3">
                                <h5>📌 Stichpunktartige Zusammenfassung:</h5>
                                <ul class="bullet-list">
                                    ${(m.bullets || [m.summary]).map(b => `<li>${b}</li>`).join('')}
                                </ul>
                            </div>

                            <!-- Speaker Conversation Tracking -->
                            ${m.speakerMap && m.speakerMap.length > 0 ? `
                                <div class="speaker-tracking-box mt-3">
                                    <h5>🗣️ Nachverfolgter Gesprächsverlauf:</h5>
                                    <div class="speaker-dialogue-list">
                                        ${m.speakerMap.map(s => {
                                            const matchedMember = members.find(mem => mem.name.toLowerCase().includes(s.speaker.toLowerCase())) || { color: '#3b82f6', avatar: '👤' };
                                            return `
                                                <div class="dialogue-chip mb-2" style="border-left: 3px solid ${matchedMember.color}">
                                                    <strong style="color: ${matchedMember.color}">${matchedMember.avatar} ${s.speaker}:</strong>
                                                    <span>${s.text}</span>
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
                                        ${m.decisions.map(d => `<li>${d}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}

                            ${m.actionItemsCreated ? `
                                <div class="badge badge-success mt-2">
                                    ✅ Generierte To-Dos wurden ins Aufgaben-Zentrum exportiert!
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
                alert('🎉 Aufnahme beendet! Das Transkript steht unten bereit zur Stichpunkt-Protokollgenerierung.');
            }
        });

        document.getElementById('generate-protocol-btn')?.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (!text) {
                alert('Bitte sprich zuerst Text ein oder tippe Notizen in das Feld.');
                return;
            }
            this.generateBulletProtocol(text, containerEl, members);
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
     * Automatic bullet point summary and speaker turn tracking
     */
    static generateBulletProtocol(rawText, containerEl, members) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const sentences = rawText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

        // 1. Generate Bullet Points ("stichpunktartig zusammenfassen")
        const bullets = [];
        const decisions = [];
        const speakerMap = [];
        const extractedTasks = [];

        sentences.forEach(sentence => {
            const lower = sentence.toLowerCase();

            // Check if sentence is a speaker dialogue turn or question/answer to a person
            members.forEach(mem => {
                const firstName = mem.name.split(' ')[0].toLowerCase();
                if (lower.includes(firstName) || lower.includes(`frage an ${firstName}`) || lower.includes(`antwort von ${firstName}`)) {
                    speakerMap.push({
                        speaker: mem.name,
                        text: sentence
                    });
                }
            });

            // Decisions
            if (lower.includes('beschluss') || lower.includes('einstimmig') || lower.includes('beschlossen') || lower.includes('genehmigt')) {
                decisions.push(sentence);
            } else {
                bullets.push(sentence);
            }

            // Tasks
            if (lower.includes('aufgabe') || lower.includes('übernimmt') || lower.includes('kümmert') || lower.includes('bestellen') || lower.includes('buchen')) {
                const matchedMember = members.find(m => lower.includes(m.name.split(' ')[0].toLowerCase())) || members[0];
                extractedTasks.push({
                    title: sentence.length > 65 ? sentence.slice(0, 62) + '...' : sentence,
                    description: `Automatisch aus Sitzungs-Transkript am ${todayStr} erkannt.`,
                    assigneeId: matchedMember.id,
                    categoryId: 'sitzung',
                    priority: 'hoch',
                    status: 'offen',
                    dueDate: todayStr
                });
            }
        });

        if (bullets.length === 0) bullets.push(rawText);
        if (decisions.length === 0) decisions.push('Sitzung ordnungsgemäß durchgeführt.');
        if (speakerMap.length === 0 && members.length > 0) {
            speakerMap.push({ speaker: members[0].name, text: rawText });
        }

        // Save generated minute
        const minutes = StorageEngine.getMinutes();
        minutes.unshift({
            id: 'm_doc_' + Date.now(),
            title: `Vorstandssitzung vom ${todayStr}`,
            date: todayStr,
            location: 'Landjugendheim Scheuring',
            summary: rawText,
            bullets: bullets,
            speakerMap: speakerMap,
            decisions: decisions,
            actionItemsCreated: true
        });
        StorageEngine.saveMinutes(minutes);

        // Auto export tasks
        const existingTasks = StorageEngine.getTasks();
        extractedTasks.forEach(t => {
            existingTasks.unshift({
                id: 't_auto_' + Math.random().toString(36).substr(2, 9),
                ...t,
                subtasks: [{ id: 'st_1', text: 'Aufgabe erledigen', completed: false }]
            });
        });
        StorageEngine.saveTasks(existingTasks);

        alert(`✨ Erfolg! Stichpunkt-Protokoll mit Gesprächsverlauf archiviert & ${extractedTasks.length} To-Do(s) für Vorstände angelegt!`);
        this.render(containerEl);
    }
}
