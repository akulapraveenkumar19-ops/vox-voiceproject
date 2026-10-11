import React from 'react';
import { Volume2, VolumeX, Sparkles, Mic, Loader2 } from 'lucide-react';
import { useVoice } from '../context/VoiceContext';

const VoiceStatus = () => {
  const { status, statusMessage, isMuted, setIsMuted, isSpeaking, stopSpeaking } = useVoice();

  const getStatusClass = () => {
    switch (status) {
      case 'listening':
        return 'status-listening';
      case 'thinking':
        return 'status-thinking';
      case 'speaking':
        return 'status-speaking';
      default:
        return 'status-ready';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'listening':
        return <Mic size={14} className="animate-pulse" />;
      case 'thinking':
        return <Loader2 size={14} className="animate-spin" />;
      case 'speaking':
        return <Sparkles size={14} className="animate-bounce" />;
      default:
        return <div className="status-indicator-dot" />;
    }
  };

  return (
    <div className="status-badge-container">
      <div className={`status-pill ${getStatusClass()}`}>
        {getIcon()}
        <span>{statusMessage}</span>
      </div>

      <button
        onClick={() => {
          if (isSpeaking) stopSpeaking();
          setIsMuted(!isMuted);
        }}
        className={`btn-icon-control ${isMuted ? '' : 'active'}`}
        title={isMuted ? 'Voice Muted (Click to Unmute)' : 'Voice Audio Active (Click to Mute)'}
        aria-label="Toggle voice output"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
};

export default VoiceStatus;
