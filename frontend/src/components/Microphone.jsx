import React from 'react';
import { Mic, MicOff, Square, Sparkles, AlertCircle, X } from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import Waveform from './Waveform';

const Microphone = () => {
  const {
    isListening,
    isSpeaking,
    isThinking,
    interimText,
    startListening,
    stopListening,
    stopSpeaking,
    errorMessage,
    setErrorMessage,
    isSupported,
  } = useVoice();

  const handleMicClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getMicClass = () => {
    if (isListening) return 'large-mic-btn listening';
    if (isSpeaking) return 'large-mic-btn speaking';
    return 'large-mic-btn';
  };

  const getStatusText = () => {
    if (isListening) return 'Listening... Speak your command';
    if (isThinking) return 'VoxWeb is thinking...';
    if (isSpeaking) return 'VoxWeb is speaking...';
    return 'Tap microphone to speak';
  };

  return (
    <div className="mic-hero-wrapper">
      {/* Speech transcript live bubble */}
      {interimText && (
        <div className="interim-speech-preview">
          <Sparkles size={16} color="var(--accent-purple)" className="animate-spin" />
          <span>You said: "{interimText}"</span>
        </div>
      )}

      {/* Error alert if mic was denied or server disconnected */}
      {errorMessage && (
        <div
          className="alert-box alert-error"
          style={{
            position: 'absolute',
            bottom: '130px',
            maxWidth: '460px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem' }}>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage && setErrorMessage(null)}
            style={{ background: 'transparent', color: '#fca5a5', padding: '2px 4px', cursor: 'pointer' }}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Microphone Button */}
      <button
        onClick={handleMicClick}
        className={getMicClass()}
        aria-label={isListening ? 'Stop listening' : 'Start voice command'}
        title={!isSupported ? 'Speech recognition not supported in this browser' : ''}
      >
        {isListening ? (
          <Square size={28} fill="currentColor" />
        ) : isSpeaking ? (
          <MicOff size={32} />
        ) : (
          <Mic size={34} />
        )}
      </button>

      {/* Animated Sound Waveform under Mic */}
      <div style={{ marginTop: '14px', marginBottom: '4px' }}>
        <Waveform
          count={18}
          active={isListening || isSpeaking || isThinking}
          height={20}
          color={isListening ? '#f43f5e' : isSpeaking ? '#38bdf8' : '#8b5cf6'}
        />
      </div>

      <div className="mic-status-hint">{getStatusText()}</div>
    </div>
  );
};

export default Microphone;
