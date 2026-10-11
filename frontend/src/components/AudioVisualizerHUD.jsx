import React, { useState, useEffect } from 'react';
import { Activity, Mic, Volume2, Cpu, Radio, Timer, X } from 'lucide-react';
import { useVoice, LLM_MODELS, AI_PERSONAS } from '../context/VoiceContext';

const WORKSPACES = [
  {
    id: 'work',
    name: 'Work Suite',
    icon: '💼',
    desc: 'GitHub, Gmail, Notion',
    urls: ['https://github.com', 'https://mail.google.com', 'https://www.notion.so'],
  },
  {
    id: 'media',
    name: 'Entertainment',
    icon: '🎬',
    desc: 'YouTube, Spotify, Netflix',
    urls: ['https://www.youtube.com', 'https://open.spotify.com', 'https://www.netflix.com'],
  },
  {
    id: 'dev',
    name: 'Dev Hub',
    icon: '💻',
    desc: 'LeetCode, StackOverflow, ChatGPT',
    urls: ['https://leetcode.com', 'https://stackoverflow.com', 'https://chatgpt.com'],
  },
];

const AudioVisualizerHUD = ({ onOpenVideoCall, onOpenWhatsApp, onOpenLLMStudio, onOpenSmartTools }) => {
  const {
    isListening,
    isSpeaking,
    isThinking,
    statusMessage,
    selectedModel,
    selectedPersona,
    handsFreeMode,
    setHandsFreeMode,
    activeTimer,
    stopTimer,
  } = useVoice();
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    let interval;
    if (isListening || isSpeaking || isThinking) {
      interval = setInterval(() => {
        setPulseScale(1 + Math.random() * 0.15);
      }, 120);
    } else {
      setPulseScale(1);
    }
    return () => clearInterval(interval);
  }, [isListening, isSpeaking, isThinking]);

  const handleLaunchWorkspace = (ws) => {
    ws.urls.forEach((url) => {
      try {
        window.open(url, '_blank');
      } catch (e) {
        console.warn('Could not launch workspace tab:', e);
      }
    });
  };

  const getStatusColor = () => {
    if (isListening) return '#ef4444';
    if (isThinking) return '#f59e0b';
    if (isSpeaking) return '#38bdf8';
    return '#10b981';
  };

  const currentModelObj = LLM_MODELS.find((m) => m.id === selectedModel) || LLM_MODELS[0];
  const currentPersonaObj = AI_PERSONAS.find((p) => p.id === selectedPersona) || AI_PERSONAS[0];

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(11, 18, 34, 0.85) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: getStatusColor(),
          opacity: 0.08,
          filter: 'blur(50px)',
          transition: 'all 0.5s ease',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Left: AI & Audio Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Animated Glowing Voice Orb */}
          <div
            style={{
              position: 'relative',
              width: 52,
              height: 52,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `radial-gradient(circle, ${getStatusColor()}33 0%, rgba(15, 23, 42, 0.8) 70%)`,
              border: `2px solid ${getStatusColor()}`,
              boxShadow: `0 0 20px ${getStatusColor()}55`,
              transform: `scale(${pulseScale})`,
              transition: 'transform 0.12s ease, border-color 0.3s ease',
            }}
          >
            {isListening ? (
              <Mic size={24} color="#fff" />
            ) : isSpeaking ? (
              <Volume2 size={24} color="#fff" />
            ) : isThinking ? (
              <Cpu size={24} color="#fff" className="spin" />
            ) : (
              <Activity size={24} color="#38bdf8" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                {isListening
                  ? 'Listening to Human Voice...'
                  : isSpeaking
                  ? 'VoxWeb AI Speaking...'
                  : isThinking
                  ? 'LLM Reasoning...'
                  : 'VoxWeb Multi-LLM Assistant'}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: getStatusColor(),
                  boxShadow: `0 0 8px ${getStatusColor()}`,
                }}
              />
              {handsFreeMode && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.45)',
                    color: '#34d399',
                  }}
                >
                  🎙️ Hands-Free Loop Active
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <span
                onClick={onOpenLLMStudio}
                style={{ cursor: onOpenLLMStudio ? 'pointer' : 'default' }}
                title="Click to switch LLM Model"
              >
                🧠 LLM: <strong style={{ color: '#38bdf8', textDecoration: 'underline' }}>{currentModelObj.name}</strong>
              </span>
              <span>•</span>
              <span
                onClick={onOpenLLMStudio}
                style={{ cursor: onOpenLLMStudio ? 'pointer' : 'default' }}
                title="Click to change AI Human Explanation Persona"
              >
                {currentPersonaObj.icon} Style: <strong style={{ color: '#a5b4fc' }}>{currentPersonaObj.name}</strong>
              </span>
              <span>•</span>
              <span>
                Status: <strong style={{ color: '#f1f5f9' }}>{statusMessage}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Active Timer Pill + Hands-Free Toggle + Workspaces */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Active Timer Countdown Pill */}
          {activeTimer && (
            <div
              onClick={onOpenSmartTools}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.22)',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                color: '#67e8f9',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Active Voice Timer"
            >
              <Timer size={15} />
              <span>
                {activeTimer.label}: {formatTimer(activeTimer.secondsLeft)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stopTimer();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f87171',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
                title="Cancel Timer"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Hands-Free Continuous Voice Toggle */}
          <button
            type="button"
            onClick={() => setHandsFreeMode(!handsFreeMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: handsFreeMode ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.06)',
              border: handsFreeMode ? '1px solid rgba(16, 185, 129, 0.55)' : '1px solid rgba(255, 255, 255, 0.14)',
              color: handsFreeMode ? '#34d399' : '#cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Toggle Continuous Human ↔ AI Voice Conversation"
          >
            <Radio size={14} />
            <span>{handsFreeMode ? 'Hands-Free: ON' : 'Hands-Free: OFF'}</span>
          </button>

          {onOpenVideoCall && (
            <button
              type="button"
              onClick={onOpenVideoCall}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.18)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Start Live AI Video Call"
            >
              <span>📹</span>
              <span>Video Call</span>
            </button>
          )}

          {onOpenWhatsApp && (
            <button
              type="button"
              onClick={onOpenWhatsApp}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(37, 211, 102, 0.18)',
                border: '1px solid rgba(37, 211, 102, 0.45)',
                color: '#4ade80',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Manage WhatsApp & QR Web"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>
          )}

          {WORKSPACES.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => handleLaunchWorkspace(ws)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title={`1-Click Launch: ${ws.desc}`}
            >
              <span>{ws.icon}</span>
              <span>{ws.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizerHUD;
