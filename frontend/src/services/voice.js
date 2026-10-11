// Web Speech API Wrapper for Human Voice STT and Natural AI TTS (English, Telugu, Hindi & Multilingual)

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

export const isSpeechRecognitionSupported = () => !!SpeechRecognition;
export const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

export class VoiceManager {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isListening = false;
    this.selectedVoice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.lang = 'en-US'; // 'en-US', 'te-IN', 'hi-IN', etc.
    this._micPermissionGranted = false;
    this._currentUtterance = null;
    this._ttsKeepAliveInterval = null;
    this._silenceTimer = null;
  }

  setLanguage(lang) {
    this.lang = lang || 'en-US';
    if (this.recognition) {
      try {
        this.recognition.lang = this.lang;
      } catch (e) {}
    }
    if (this.synthesis) {
      const voices = this.getAvailableVoices();
      const best = this.findBestVoiceForLang(this.lang, voices);
      if (best) this.selectedVoice = best;
    }
  }

  findBestVoiceForLang(langCode, voices = []) {
    if (!voices || voices.length === 0) return null;
    const prefix = (langCode || 'en').split('-')[0].toLowerCase();

    if (prefix === 'te') {
      return (
        voices.find((v) => v.lang.toLowerCase().startsWith('te') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Shruti') || v.name.includes('Mohan'))) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('te') || v.name.toLowerCase().includes('telugu')) ||
        voices.find((v) => v.lang.includes('IN'))
      );
    }

    if (prefix === 'hi') {
      return (
        voices.find((v) => v.lang.toLowerCase().startsWith('hi') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Swara') || v.name.includes('Madhur'))) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi')) ||
        voices.find((v) => v.lang.includes('IN'))
      );
    }

    return (
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(prefix) &&
          (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Aria') || v.name.includes('Jenny') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium'))
      ) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
      voices[0]
    );
  }

  async startListening({ onResult, onInterim, onStart, onEnd, onError, _isRetry = false }) {
    const RecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!RecognitionClass) {
      onError?.(
        new Error(
          'Speech recognition is not supported in this browser. Please open VoxWeb in Google Chrome or Microsoft Edge.'
        )
      );
      return;
    }

    this.stopListening();

    // Verify microphone permission once
    if (!this._micPermissionGranted && navigator.mediaDevices?.getUserMedia) {
      try {
        let isAlreadyGranted = false;
        if (navigator.permissions?.query) {
          try {
            const status = await navigator.permissions.query({ name: 'microphone' });
            if (status.state === 'granted') {
              isAlreadyGranted = true;
              this._micPermissionGranted = true;
            }
          } catch (e) {}
        }

        if (!isAlreadyGranted) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          this._micPermissionGranted = true;
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      } catch (permErr) {
        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          onError?.(
            new Error(
              'Microphone permission denied. Please click the mic icon in your browser URL bar and set Microphone to "Allow".'
            )
          );
          return;
        }
      }
    }

    try {
      const rec = new RecognitionClass();
      this.recognition = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = this.lang || 'en-US';

      let accumulatedFinal = '';
      let latestInterim = '';
      let hasDelivered = false;

      const deliverFinalSpeech = () => {
        if (hasDelivered) return;
        const combined = `${accumulatedFinal} ${latestInterim}`.replace(/\s+/g, ' ').trim();
        if (combined) {
          hasDelivered = true;
          if (this._silenceTimer) {
            clearTimeout(this._silenceTimer);
            this._silenceTimer = null;
          }
          try {
            rec.stop();
          } catch (e) {}
          onResult?.(combined);
        }
      };

      rec.onstart = () => {
        this.isListening = true;
        onStart?.();
      };

      rec.onresult = (event) => {
        let sessionInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedFinal += (accumulatedFinal ? ' ' : '') + piece.trim();
          } else {
            sessionInterim += piece;
          }
        }
        latestInterim = sessionInterim.trim();

        const preview = `${accumulatedFinal} ${latestInterim}`.replace(/\s+/g, ' ').trim();
        if (preview) {
          onInterim?.(preview);
        }

        // Reset silence timer so human can speak naturally and auto-submit after a brief pause
        if (this._silenceTimer) clearTimeout(this._silenceTimer);
        const waitMs = accumulatedFinal ? 850 : 1700;
        this._silenceTimer = setTimeout(() => {
          deliverFinalSpeech();
        }, waitMs);
      };

      rec.onerror = (event) => {
        if (this._silenceTimer) {
          clearTimeout(this._silenceTimer);
          this._silenceTimer = null;
        }
        if (event.error === 'aborted') {
          this.isListening = false;
          return;
        }
        // If we already captured human speech before a minor event, deliver it!
        const captured = `${accumulatedFinal} ${latestInterim}`.replace(/\s+/g, ' ').trim();
        if (captured && !hasDelivered) {
          deliverFinalSpeech();
          return;
        }

        this.isListening = false;
        if (event.error === 'network' && !_isRetry) {
          console.warn('[VoxWeb Voice] Speech recognition network glitch detected. Retrying...');
          setTimeout(() => {
            this.startListening({ onResult, onInterim, onStart, onEnd, onError, _isRetry: true });
          }, 300);
          return;
        }

        let msg = 'Microphone error occurred.';
        if (event.error === 'not-allowed') {
          msg = 'Microphone access denied. Please allow microphone permissions in browser settings.';
        } else if (event.error === 'no-speech') {
          msg = this.lang.startsWith('te')
            ? 'ఏమి వినపడలేదు. దయచేసి మళ్లీ మాట్లాడండి. (No speech detected. Please speak again.)'
            : this.lang.startsWith('hi')
            ? 'कोई आवाज़ नहीं सुनाई दी। कृपया फिर से बोलें। (No speech detected.)'
            : 'No speech detected. Tap the microphone and speak clearly.';
        } else if (event.error === 'network') {
          msg = 'Speech recognition network error. Please check your internet connection or type your question below.';
        } else if (event.error === 'audio-capture') {
          msg = 'No microphone detected. Please check your audio input device.';
        }
        onError?.(new Error(msg));
      };

      rec.onend = () => {
        if (this._silenceTimer) {
          clearTimeout(this._silenceTimer);
          this._silenceTimer = null;
        }
        this.isListening = false;
        if (!hasDelivered) {
          const remaining = `${accumulatedFinal} ${latestInterim}`.replace(/\s+/g, ' ').trim();
          if (remaining) {
            hasDelivered = true;
            onResult?.(remaining);
          }
        }
        onEnd?.();
      };

      rec.start();
    } catch (err) {
      this.isListening = false;
      onError?.(err);
    }
  }

  stopListening() {
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        try {
          this.recognition.abort();
        } catch (e2) {}
      }
      this.recognition = null;
    }
    this.isListening = false;
  }

  speak(text, { onStart, onEnd, onError, voice, rate, pitch } = {}) {
    if (!this.synthesis) {
      onError?.(new Error('Speech synthesis is not supported.'));
      return;
    }

    this.stopSpeaking();

    const cleanText = (text || '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    const startSpeech = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      this._currentUtterance = utterance; // Prevent browser GC mid-speech
      utterance.rate = rate ?? this.rate;
      utterance.pitch = pitch ?? this.pitch;
      utterance.volume = this.volume;

      const voices = this.getAvailableVoices();
      const hasTelugu = /[\u0C00-\u0C7F]/.test(cleanText);
      const hasHindi = /[\u0900-\u097F]/.test(cleanText);

      if (hasTelugu) {
        utterance.lang = 'te-IN';
        const teVoice = this.findBestVoiceForLang('te-IN', voices);
        if (teVoice) utterance.voice = teVoice;
      } else if (hasHindi) {
        utterance.lang = 'hi-IN';
        const hiVoice = this.findBestVoiceForLang('hi-IN', voices);
        if (hiVoice) utterance.voice = hiVoice;
      } else {
        utterance.lang = this.lang || 'en-US';
        if (voice) {
          utterance.voice = voice;
        } else if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
        } else {
          const best = this.findBestVoiceForLang(utterance.lang, voices);
          if (best) utterance.voice = best;
        }
      }

      utterance.onstart = () => {
        // Keep-alive for Chrome speechSynthesis 15s timeout bug
        if (this._ttsKeepAliveInterval) clearInterval(this._ttsKeepAliveInterval);
        this._ttsKeepAliveInterval = setInterval(() => {
          if (this.synthesis && this.synthesis.speaking && !this.synthesis.paused) {
            this.synthesis.pause();
            this.synthesis.resume();
          }
        }, 10000);
        onStart?.();
      };

      const cleanup = () => {
        if (this._ttsKeepAliveInterval) {
          clearInterval(this._ttsKeepAliveInterval);
          this._ttsKeepAliveInterval = null;
        }
        this._currentUtterance = null;
      };

      utterance.onend = () => {
        cleanup();
        onEnd?.();
      };

      utterance.onerror = (e) => {
        cleanup();
        if (e?.error === 'interrupted' || e?.error === 'canceled') {
          onEnd?.();
          return;
        }
        onError?.(e);
      };

      if (this.synthesis.paused) {
        this.synthesis.resume();
      }
      this.synthesis.speak(utterance);
    };

    // Brief 40ms delay after cancel ensures Chrome/Windows audio queue doesn't drop the new utterance
    setTimeout(startSpeech, 40);
  }

  stopSpeaking() {
    if (this._ttsKeepAliveInterval) {
      clearInterval(this._ttsKeepAliveInterval);
      this._ttsKeepAliveInterval = null;
    }
    this._currentUtterance = null;
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
    }
  }

  getAvailableVoices() {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }
}

export const voiceManager = new VoiceManager();
