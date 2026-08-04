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
        this.timerInterval = null;
        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'de-DE';

            this.recognition.onresult = (event) => {
                let currentInterim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        this.transcriptText += event.results[i][0].transcript + '. ';
                    } else {
                        currentInterim += event.results[i][0].transcript;
                    }
                }
                if (this.onTranscriptUpdate) {
                    this.onTranscriptUpdate(this.transcriptText + currentInterim);
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
            "Florian Huber eröffnet die Vorstandssitzung um 19 Uhr 30 im Landjugendheim.",
            "Sandra Berger berichtet zum Kassenstand: Für das Sommernachtsfest haben wir 1420 Euro Gewinn erzielt.",
            "Beschluss einstimmig gefasst: Das Festzelt für 2027 wird bei Verleih Meyer verbindlich gebucht.",
            "Ergebnis der Aufgabenverteilung: Felix Gruber kümmert sich um die Zelt-Genehmigung bis 15. August.",
            "Maximilian Bauer übernimmt die Getränkebestellung bei Wieninger Brauerei bis 18. August.",
            "Sarah Richter erstellt Plakate und schaltet Werbung auf Instagram.",
            "Die nächste Sitzung findet am 24. August um 20 Uhr statt."
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
