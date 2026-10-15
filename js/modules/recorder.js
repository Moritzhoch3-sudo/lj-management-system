/**
 * Live Audio Recorder & Web Speech API Speech-to-Text Engine
 */
export class AudioRecorderEngine {
    constructor(onTranscriptUpdate, onStatusChange) {
        this.onTranscriptUpdate = onTranscriptUpdate;
        this.onStatusChange = onStatusChange;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recognition = null;
        this.transcriptText = '';
        this.recordingSeconds = 0;
        this.lastSpeechTime = 0;
        this.currentSpeakerTurn = 1;
        this.currentSpeakerLabel = 'Sprecher 1';
        this.turnHasStarted = false;
        this.initSpeechRecognition();
    }

    detectMemberSpeaker(text) {
        if (!text) return null;
        const lower = text.toLowerCase();
        const NICKNAMES = {
            'kili': 'Kilian Salai',
            'kilian': 'Kilian Salai',
            'vali': 'Valentin Müllner',
            'valentin': 'Valentin Müllner',
            'linda': 'Linda Schweiger',
            'schwaigerin': 'Linda Schweiger',
            'moritz': 'Moritz Kubik',
            'anja': 'Anja Löb',
            'lena': 'Lena Senior',
            'rosa': 'Rosa Krieglmeier',
            'cassy': 'Cassandra Wunner',
            'cassandra': 'Cassandra Wunner',
            'felix': 'Felix Premer',
            'premer': 'Felix Premer',
            'johannes': 'Johannes Erhard',
            'hanni': 'Johannes Erhard',
            'domi': 'Dominique Zahn',
            'dominique': 'Dominique Zahn',
            'michi': 'Michaela Grabmaier',
            'michaela': 'Michaela Grabmaier'
        };

        for (const [nick, fullName] of Object.entries(NICKNAMES)) {
            const pattern = new RegExp(`\\b${nick}\\b`, 'i');
            if (pattern.test(lower)) {
                return fullName;
            }
        }
        return null;
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'de-DE';

            this.recognition.onresult = (event) => {
                const now = Date.now();
                let currentInterim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const text = event.results[i][0].transcript.trim();
                    if (!text) continue;

                    if (event.results[i].isFinal) {
                        // Pause > 1300ms indicates a new speaker turn
                        if (this.lastSpeechTime > 0 && (now - this.lastSpeechTime) > 1300) {
                            this.currentSpeakerTurn++;
                            this.currentSpeakerLabel = `Sprecher ${((this.currentSpeakerTurn - 1) % 4) + 1}`;
                            this.turnHasStarted = false;
                        }

                        // Check if a member is addressed or talking
                        const detectedMember = this.detectMemberSpeaker(text);
                        if (detectedMember) {
                            this.currentSpeakerLabel = detectedMember;
                        }

                        if (!this.turnHasStarted) {
                            this.transcriptText += (this.transcriptText ? '\n' : '') + `[${this.currentSpeakerLabel}]: ${text}. `;
                            this.turnHasStarted = true;
                        } else {
                            this.transcriptText += `${text}. `;
                        }

                        this.lastSpeechTime = now;
                    } else {
                        currentInterim += text;
                    }
                }
                if (this.onTranscriptUpdate) {
                    const interimDisplay = currentInterim ? `\n[${this.currentSpeakerLabel}]: ${currentInterim}...` : '';
                    this.onTranscriptUpdate((this.transcriptText + interimDisplay).trim());
                }
            };

            this.recognition.onerror = (err) => {
                console.warn('Speech Recognition notice/error:', err.error);
            };
        }
    }

    async startRecording() {
        this.audioChunks = [];
        this.transcriptText = '';
        this.recordingSeconds = 0;

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.start(1000);
            this.isRecording = true;

            // Start Speech Recognition if supported
            if (this.recognition) {
                try { this.recognition.start(); } catch (e) { console.log('Recognition already active'); }
            }

            // Start timer
            this.timerInterval = setInterval(() => {
                this.recordingSeconds++;
                if (this.onStatusChange) {
                    this.onStatusChange({ isRecording: true, seconds: this.recordingSeconds });
                }
            }, 1000);

            if (this.onStatusChange) {
                this.onStatusChange({ isRecording: true, seconds: 0 });
            }

        } catch (err) {
            console.error('Microphone error or permission denied:', err);
            // Fallback: Simulated Recording mode for testing without mic
            this.startSimulatedRecording();
        }
    }

    startSimulatedRecording() {
        this.isRecording = true;
        this.recordingSeconds = 0;
        this.transcriptText = '';

        const sampleSpeech = [
            "[Valentin Müllner]: Eröffnung der Vorstandssitzung um 19:30 Uhr im Landjugendheim.",
            "[Anja Löb]: Kassenstand Sommernachtsfest: Wir haben 1.420 € Reingewinn erzielt.",
            "[Valentin Müllner]: Kili, könntest du den Klowagen fürs nächste Fest noch abholen?",
            "[Kilian Salai]: Ja, mach ich, hole den Klowagen bis Donnerstag ab.",
            "[Linda Schweiger]: Einstimmiger Beschluss: Das Festzelt 2027 wird verbindlich gebucht.",
            "[Felix Premer]: Ich kümmere mich um die Schank- und Zeltgenehmigung bei der Gemeinde bis 15. August.",
            "[Moritz Kubik]: Dominique und ich prüfen die Rechnungen und Kassenbelege.",
            "[Valentin Müllner]: Nächste Vorstandssitzung findet am 24. August um 20:00 Uhr statt."
        ];

        let index = 0;
        this.timerInterval = setInterval(() => {
            this.recordingSeconds++;
            if (this.recordingSeconds % 4 === 0 && index < sampleSpeech.length) {
                this.transcriptText += sampleSpeech[index] + ' ';
                index++;
                if (this.onTranscriptUpdate) {
                    this.onTranscriptUpdate(this.transcriptText);
                }
            }
            if (this.onStatusChange) {
                this.onStatusChange({ isRecording: true, seconds: this.recordingSeconds, isSimulated: true });
            }
        }, 1000);
    }

    stopRecording() {
        return new Promise((resolve) => {
            this.isRecording = false;
            clearInterval(this.timerInterval);

            if (this.recognition) {
                try { this.recognition.stop(); } catch (e) {}
            }

            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    if (this.onStatusChange) this.onStatusChange({ isRecording: false, seconds: this.recordingSeconds });
                    resolve({ audioBlob, audioUrl, transcript: this.transcriptText });
                };
                this.mediaRecorder.stop();
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            } else {
                if (this.onStatusChange) this.onStatusChange({ isRecording: false, seconds: this.recordingSeconds });
                resolve({ audioBlob: null, audioUrl: null, transcript: this.transcriptText });
            }
        });
    }

    static formatSeconds(totalSec) {
        const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const secs = (totalSec % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
}
