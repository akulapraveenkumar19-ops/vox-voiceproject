import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, MessageSquare, X, Delete, Globe, User, ShieldCheck } from 'lucide-react';
import { useVoice } from '../context/VoiceContext';

const COUNTRY_CODES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
];

const DIAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const AICallModal = ({ isOpen, onClose, initialNumber = '' }) => {
  const { speak, stopSpeaking, language } = useVoice();
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'connected'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (initialNumber) {
      setPhoneNumber(initialNumber);
    }
  }, [initialNumber]);

  // Active call duration counter
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playTone = (freq = 440) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const handleKeyPress = (val) => {
    playTone(500 + val.charCodeAt(0) * 10);
    setPhoneNumber((prev) => prev + val);
  };

  const handleDeleteDigit = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const getFullPhone = () => {
    const raw = phoneNumber.trim();
    const digits = raw.replace(/\D/g, '');
    const codeDigits = countryCode.replace('+', '');
    if (raw.startsWith('+')) {
      return { tel: raw, wa: digits, sms: raw };
    }
    if (digits.startsWith(codeDigits) && digits.length > codeDigits.length + 5) {
      return { tel: `+${digits}`, wa: digits, sms: `+${digits}` };
    }
    return {
      tel: `${countryCode}${digits}`,
      wa: `${codeDigits}${digits}`,
      sms: `${countryCode}${digits}`,
    };
  };

  // Mode 1: Device Call via Native Protocol (tel:<number>)
  const handleDevicePhoneCall = () => {
    if (!phoneNumber.trim()) return;
    const { tel } = getFullPhone();
    window.location.href = `tel:${tel}`;
  };

  // Mode 2: WhatsApp Device Calling
  const handleWhatsAppCall = () => {
    if (!phoneNumber.trim()) return;
    const { wa } = getFullPhone();
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent('Hello from VoxWeb Voice Assistant!')}`, '_blank');
  };

  // Mode 2b: Quick WhatsApp Message
  const handleSendQuickMessage = (msg = 'Call me back later') => {
    if (!phoneNumber.trim()) return;
    const { wa } = getFullPhone();
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Mode 2c: Quick SMS
  const handleSendSMS = (msg = 'Call me back later') => {
    if (!phoneNumber.trim()) return;
    const { sms } = getFullPhone();
    window.location.href = `sms:${sms}?body=${encodeURIComponent(msg)}`;
  };

  // Mode 3: Interactive Simulated AI Agent Live Call
  const handleStartAICall = () => {
    if (!phoneNumber.trim()) return;
    setCallState('calling');

    // Simulate ringback tone then connect after 2 seconds
    setTimeout(() => {
      setCallState('connected');
      const isTelugu = language && language.startsWith('te');
      const greeting = isTelugu
        ? `నమస్కారం! నేను వోక్స్ వెబ్ AI అసిస్టెంట్‌ని మాట్లాడుతున్నాను. ${countryCode} ${phoneNumber} నంబర్‌కు కనెక్ట్ అయ్యాను. నేను మీకు ఎలా సహాయపడగలను?`
        : `Hello! This is VoxWeb AI Assistant connecting live to ${countryCode} ${phoneNumber}. Your device audio session is now active. How can I help you today?`;
      speak(greeting);
    }, 2200);
  };

  const handleEndCall = () => {
    stopSpeaking();
    setCallState('idle');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '24px',
          padding: '1.75rem',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '8px',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>

        {callState === 'idle' ? (
          <div>
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(124, 58, 237, 0.25) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  color: 'var(--accent-blue)',
                }}
              >
                <PhoneCall size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', fontWeight: 800 }}>AI Smart Dialer</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Enter phone number to call another device or start an AI voice call
              </p>
            </div>

            {/* Country Code & Number Input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
              <select
                className="form-input"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{ width: '110px', padding: '10px 8px', fontSize: '0.85rem' }}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    paddingRight: '36px',
                  }}
                  autoFocus
                />
                {phoneNumber && (
                  <button
                    type="button"
                    onClick={handleDeleteDigit}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <Delete size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '1.25rem',
              }}
            >
              {DIAL_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeyPress(k)}
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)')}
                  onMouseUp={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* 3 Call Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Option A: AI Interactive Voice Call */}
              <button
                type="button"
                onClick={handleStartAICall}
                disabled={!phoneNumber.trim()}
                className="btn-gradient-submit"
                style={{
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
                }}
              >
                <PhoneCall size={18} />
                <span>Start AI Voice Call ({countryCode} {phoneNumber || '...'})</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* Option B: Standard Device Dial (tel:) */}
                <button
                  type="button"
                  onClick={handleDevicePhoneCall}
                  disabled={!phoneNumber.trim()}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: phoneNumber.trim() ? 'pointer' : 'not-allowed',
                    opacity: phoneNumber.trim() ? 1 : 0.5,
                  }}
                >
                  <Phone size={15} />
                  <span>Call Device</span>
                </button>

                {/* Option C: WhatsApp Call / Chat */}
                <button
                  type="button"
                  onClick={handleWhatsAppCall}
                  disabled={!phoneNumber.trim()}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.4)',
                    color: '#4ade80',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: phoneNumber.trim() ? 'pointer' : 'not-allowed',
                    opacity: phoneNumber.trim() ? 1 : 0.5,
                  }}
                >
                  <MessageSquare size={15} />
                  <span>WhatsApp</span>
                </button>
              </div>

              {/* Quick Preset Message Options */}
              <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSendQuickMessage('Call me back later')}
                  disabled={!phoneNumber.trim()}
                  style={{
                    flex: '1 1 auto',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(37, 211, 102, 0.12)',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    color: '#4ade80',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: phoneNumber.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp: "Call me back later"</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSMS('Call me back later')}
                  disabled={!phoneNumber.trim()}
                  style={{
                    flex: '1 1 auto',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: phoneNumber.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <MessageSquare size={13} />
                  <span>SMS: "Call me back later"</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Call Screen */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: callState === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                border: `3px solid ${callState === 'connected' ? '#10b981' : '#38bdf8'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: callState === 'connected' ? '#10b981' : '#38bdf8',
                boxShadow: `0 0 25px ${callState === 'connected' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                animation: 'pulse 1.8s infinite',
              }}
            >
              <PhoneCall size={36} />
            </div>

            <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              {countryCode} {phoneNumber}
            </h3>

            <p style={{ margin: '6px 0 16px', color: callState === 'connected' ? '#34d399' : '#38bdf8', fontWeight: 600 }}>
              {callState === 'calling' ? 'Ringing device...' : `Connected • ${formatTimer(callDuration)}`}
            </p>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '1.75rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {language?.startsWith('te')
                  ? 'వోక్స్ వెబ్ AI కాల్ కనెక్ట్ చేయబడింది. మాట్లాడండి...'
                  : 'AI Voice session active. Speak to converse with your assistant.'}
              </div>
            </div>

            {/* Active Call Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: isMuted ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: isMuted ? '#f87171' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                }}
                title="End Call"
              >
                <PhoneOff size={28} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICallModal;
