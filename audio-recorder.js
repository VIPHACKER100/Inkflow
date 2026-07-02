/* ───────────────────────────────────────────
   PHASE 8 — AUDIO RECORDER (VOICE-TO-NOTES)
─────────────────────────────────────────── */

class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.startTime = 0;
    this.timerInterval = null;
    this.recognition = null;
    this.transcription = '';

    // UI Elements
    this.btnRecord = document.getElementById('btn-record-lecture');
    this.statusPanel = document.getElementById('recording-status-panel');
    this.timerDisplay = document.getElementById('recording-timer');
    this.sizeDisplay = document.getElementById('recording-size');
    this.textarea = document.getElementById('text-input');

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US'; // Could dynamically set this

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          this.transcription += finalTranscript;
          this.textarea.value = this.transcription + interimTranscript;
        } else {
          this.textarea.value = this.transcription + interimTranscript;
        }
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
      };
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.updateSizeDisplay();
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      this.mediaRecorder.start(1000); // chunk every second
      this.isRecording = true;
      
      // Reset transcription
      this.transcription = '';
      if (this.recognition) {
        try { this.recognition.start(); } catch(e) {}
      }

      this.updateUIStart();
      this.startTimer();

    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
      
      if (this.recognition) {
        try { this.recognition.stop(); } catch(e) {}
      }
      
      this.stopTimer();
      this.updateUIStop();
    }
  }

  processRecording() {
    if (this.transcription.trim().length > 0) {
      this.textarea.value = this.transcription;
      this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof window.aiAction === 'function') {
        window.aiAction('lecture');
      }
    }
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      this.timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  updateSizeDisplay() {
    const bytes = this.audioChunks.reduce((acc, chunk) => acc + chunk.size, 0);
    const kb = (bytes / 1024).toFixed(1);
    this.sizeDisplay.textContent = `${kb} KB`;
  }

  updateUIStart() {
    this.btnRecord.innerHTML = '⏹️ Stop Recording';
    this.btnRecord.classList.remove('accent');
    this.btnRecord.style.backgroundColor = '#ff4444';
    this.btnRecord.style.color = '#fff';
    this.statusPanel.classList.remove('hidden');
    this.timerDisplay.textContent = '00:00';
    this.sizeDisplay.textContent = '0 KB';
  }

  updateUIStop() {
    this.btnRecord.innerHTML = '🎙️ Record Lecture';
    this.btnRecord.classList.add('accent');
    this.btnRecord.style.backgroundColor = '';
    this.btnRecord.style.color = '';
    this.statusPanel.classList.add('hidden');
  }
}

// Initialize globally
let audioRecorderInstance = null;

window.toggleAudioRecording = function() {
  if (!audioRecorderInstance) {
    audioRecorderInstance = new AudioRecorder();
  }
  audioRecorderInstance.toggleRecording();
}
