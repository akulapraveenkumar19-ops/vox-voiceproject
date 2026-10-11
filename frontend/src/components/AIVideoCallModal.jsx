import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
  Maximize2,
  Minimize2,
  Volume2,
  Sparkles,
  Bot,
  User,
  MessageSquare,
  RefreshCw,
  Camera,
  Activity,
  Columns,
  Grid,
  Globe,
  AlertCircle,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import { voiceManager } from '../services/voice';

const AI_PERSONAS = [
  {
    id: 'ava',
    name: 'Ava AI',
    role: 'Intelligent Voice Companion',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.45)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    greeting: 'Hello! I am Ava. I can see you clearly through our video session. How can I assist you today?',
    greetingTe: 'నమస్కారం! నేను అవా. లైవ్ వీడియో కాల్‌కు స్వాగతం. మీరు తెలుగులో మాట్లాడవచ్చు, నేను సమాధానం ఇస్తాను!',
  },
  {
    id: 'nova',
    name: 'Nova AI',
    role: 'Creative Web Assistant',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.45)',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    greeting: 'Hi there! Nova online on live video. Ready to browse, create, and converse in any language you prefer!',
    greetingTe: 'హలో! నోవా లైవ్ వీడియోలో సిద్ధంగా ఉంది. ఏదైనా ప్రశ్న అడగండి!',
  },
  {
    id: 'leo',
    name: 'Leo AI',
    role: 'Executive Analyst',
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.45)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    greeting: 'Greetings! Leo online. Video latency is optimal. Feel free to speak in English or Telugu.',
    greetingTe: 'నమస్కారం! నేను లియో. వీడియో మరియు ఆడియో కనెక్ట్ అయ్యాయి. మీ సందేహాలు అడగండి.',
  },
];

const AIVideoCallModal = ({ isOpen, onClose, onOpenWhatsApp }) => {
  const { speak, stopSpeaking, isSpeaking, isThinking, language, setLanguage, executeCommand } = useVoice();
  const isTelugu = Boolean(language && language.startsWith('te'));

  const [selectedPersona, setSelectedPersona] = useState(AI_PERSONAS[0]);
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState('split'); // 'split' (side-by-side) or 'pip' (picture-in-picture)

  // Camera stream states
  const [cameraState, setCameraState] = useState('initializing'); // 'initializing' | 'active' | 'denied' | 'error' | 'simulated'
  const [cameraErrorMsg, setCameraErrorMsg] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [userStream, setUserStream] = useState(null);

  // Live talk & subtitles state
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [liveCaption, setLiveCaption] = useState('');
  const [aiTalkingPulse, setAiTalkingPulse] = useState(1);

  const userVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const userStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const modalContainerRef = useRef(null);
  const timerRef = useRef(null);

  // Function to initialize webcam stream with robust fallbacks
  const startCamera = async (deviceId = null) => {
    setCameraState('initializing');
    setCameraErrorMsg(null);

    // Stop existing stream if running
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((track) => track.stop());
      userStreamRef.current = null;
      setUserStream(null);
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraState('error');
      setCameraErrorMsg('Your browser does not support camera access. Simulated video mode enabled.');
      return;
    }

    // List of constraints to attempt sequentially
    const videoConstraints = deviceId
      ? [{ video: { deviceId: { exact: deviceId } }, audio: false }]
      : [
          { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false },
          { video: true, audio: false },
          { video: { width: 640, height: 480 }, audio: false },
        ];

    let acquiredStream = null;
    let lastError = null;

    for (const constraints of videoConstraints) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (acquiredStream) break;
      } catch (err) {
        lastError = err;
        console.warn('Camera constraint attempt failed, trying fallback:', constraints, err);
      }
    }

    if (acquiredStream) {
      userStreamRef.current = acquiredStream;
      setUserStream(acquiredStream);
      setCameraState('active');
      setIsVideoMuted(false);

      // Enumerate cameras for device selector
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
      } catch (e) {}
    } else {
      console.error('All camera attempts failed:', lastError);
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraErrorMsg(
          'Camera access blocked. Click the lock or camera icon in your browser URL bar, set Camera to "Allow", and click Retry.'
        );
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        setCameraState('error');
        setCameraErrorMsg('No physical camera device was detected on your computer.');
      } else if (lastError?.name === 'NotReadableError') {
        setCameraState('error');
        setCameraErrorMsg('Your camera is currently in use by another application (Zoom, Teams, etc.). Please close it and retry.');
      } else {
        setCameraState('error');
        setCameraErrorMsg(lastError?.message || 'Unable to start camera.');
      }
    }
  };

  // Attach stream to video element whenever userStream or video element changes
  useEffect(() => {
    if (userVideoRef.current && userStream) {
      userVideoRef.current.srcObject = userStream;
      userVideoRef.current.play().catch((e) => console.warn('User video play warning:', e));
    }
  }, [userStream]);

  // Main lifecycle when modal opens
  useEffect(() => {
    if (!isOpen) return;

    startCamera();

    // AI greeting
    const greetingText = isTelugu ? selectedPersona.greetingTe : selectedPersona.greeting;
    setLiveCaption(greetingText);
    const greetTimeout = setTimeout(() => {
      speak(greetingText);
    }, 600);

    // Start duration timer
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(greetTimeout);
      clearInterval(timerRef.current);
      stopSpeaking();

      // Clean up video streams
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach((track) => track.stop());
        userStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
    };
  }, [isOpen]);

  // Speaking pulse animation for AI avatar
  useEffect(() => {
    let interval;
    if (isSpeaking) {
      interval = setInterval(() => {
        setAiTalkingPulse(1 + Math.random() * 0.18);
      }, 110);
    } else {
      setAiTalkingPulse(1);
    }
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Toggle user camera track
  const handleToggleCamera = () => {
    if (userStreamRef.current) {
      const videoTrack = userStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    } else {
      setIsVideoMuted((prev) => !prev);
    }
  };

  // Switch camera device
  const handleSelectCamera = (e) => {
    const devId = e.target.value;
    setSelectedCameraId(devId);
    startCamera(devId);
  };

  // Toggle Language between English and Telugu on the fly
  const handleToggleLanguage = () => {
    const nextLang = isTelugu ? 'en-US' : 'te-IN';
    setLanguage(nextLang);
    const switchMsg = nextLang.startsWith('te')
      ? 'భాష తెలుగుకి మార్చబడింది. మీరు ఇప్పుడు తెలుగులో మాట్లాడవచ్చు.'
      : 'Language switched to English. You can speak now in English.';
    setLiveCaption(switchMsg);
    speak(switchMsg);
  };

  // Live Talk inside Video Call
  const handleStartTalking = () => {
    if (isUserTalking) {
      voiceManager.stopListening();
      setIsUserTalking(false);
      return;
    }

    stopSpeaking();
    setIsUserTalking(true);
    setUserTranscript(isTelugu ? 'వింటున్నాను... మాట్లాడండి' : 'Listening... Speak now');

    voiceManager.startListening({
      onStart: () => {
        setIsUserTalking(true);
        setUserTranscript(isTelugu ? 'వింటున్నాను... మాట్లాడండి' : 'Listening... Speak now');
      },
      onInterim: (text) => {
        setUserTranscript(text);
      },
      onResult: async (finalText) => {
        setIsUserTalking(false);
        if (finalText && finalText.trim()) {
          setUserTranscript(finalText);
          const result = await executeCommand(finalText);
          if (result && result.response) {
            setLiveCaption(result.response);
          }
        }
      },
      onError: (err) => {
        setIsUserTalking(false);
        setUserTranscript(err?.message || 'Voice error');
        setTimeout(() => setUserTranscript(''), 3000);
      },
      onEnd: () => {
        setIsUserTalking(false);
      },
    });
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (e) {
        console.warn('Screen share cancelled:', e);
      }
    }
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleEndCall = () => {
    stopSpeaking();
    voiceManager.stopListening();
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    onClose();
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 130,
        padding: isFullscreen ? 0 : '1rem',
      }}
    >
      <div
        ref={modalContainerRef}
        style={{
          width: isFullscreen ? '100vw' : '100%',
          maxWidth: isFullscreen ? '100vw' : '1060px',
          height: isFullscreen ? '100vh' : '88vh',
          maxHeight: '850px',
          borderRadius: isFullscreen ? 0 : '24px',
          background: 'linear-gradient(135deg, #0b1329 0%, #030712 100%)',
          border: isFullscreen ? 'none' : '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 50px rgba(56, 189, 248, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: 'rgba(15, 23, 42, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 10,
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Left: Persona & Call Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: selectedPersona.glow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${selectedPersona.color}`,
              }}
            >
              <Bot size={22} color={selectedPersona.color} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
                  {selectedPersona.name}
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 8px #22c55e',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 700,
                  }}
                >
                  HD Live
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {selectedPersona.role} • <strong style={{ color: '#f1f5f9' }}>{formatTimer(callDuration)}</strong>
              </div>
            </div>
          </div>

          {/* Center/Right: Language Toggle, Camera Selector & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Multilingual / Telugu Toggle Button */}
            <button
              type="button"
              onClick={handleToggleLanguage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: isTelugu ? 'rgba(124, 58, 237, 0.28)' : 'rgba(56, 189, 248, 0.15)',
                border: isTelugu ? '1px solid #8b5cf6' : '1px solid rgba(56, 189, 248, 0.4)',
                color: isTelugu ? '#c084fc' : '#38bdf8',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
              title={isTelugu ? 'Switch to English' : 'తెలుగులోకి మార్చండి'}
            >
              <Globe size={14} />
              <span>{isTelugu ? '🇮🇳 తెలుగు (Telugu)' : '🇺🇸 English'}</span>
            </button>

            {/* Layout Mode Toggle: Split vs PiP */}
            <button
              type="button"
              onClick={() => setLayoutMode(layoutMode === 'split' ? 'pip' : 'split')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Toggle Layout View"
            >
              <Columns size={14} />
              <span>{layoutMode === 'split' ? 'Split View' : 'PiP View'}</span>
            </button>

            {/* Camera Device Switcher (if multiple available) */}
            {availableCameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={handleSelectCamera}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  maxWidth: '140px',
                }}
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Camera Permission Alert Banner (if denied or error) */}
        {cameraState !== 'active' && (
          <div
            style={{
              padding: '10px 18px',
              background: cameraState === 'denied' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              zIndex: 15,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.84rem' }}>
              <AlertCircle size={18} color={cameraState === 'denied' ? '#ef4444' : '#f59e0b'} />
              <span>{cameraErrorMsg || 'Connecting camera...'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => startCamera(selectedCameraId)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: '#38bdf8',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🔄 Retry Camera
              </button>
              <button
                type="button"
                onClick={() => setCameraState('simulated')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🎭 Use Virtual Cam
              </button>
            </div>
          </div>
        )}

        {/* Main Video Call Stage */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            padding: layoutMode === 'split' ? '16px' : '0',
            gap: '16px',
            background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.6) 0%, rgba(2, 6, 23, 0.95) 100%)',
            overflow: 'hidden',
          }}
        >
          {/* Split Mode: USER VIDEO STAGE (Left 50%) */}
          {layoutMode === 'split' && (
            <div
              style={{
                flex: 1,
                borderRadius: '20px',
                background: '#090d1a',
                border: '2px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Actual HTML5 Video element always rendered */}
              <video
                ref={userVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Mirror user webcam
                  display: isVideoMuted || cameraState !== 'active' ? 'none' : 'block',
                }}
              />

              {/* Fallback View if camera is off or simulated */}
              {(isVideoMuted || cameraState !== 'active') && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(124, 58, 237, 0.25) 100%)',
                      border: '2px solid #38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <User size={46} color="#38bdf8" />
                  </div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                    {isTelugu ? 'మీరు (లైవ్ యూజర్)' : 'You (Live Participant)'}
                  </h4>
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {isVideoMuted
                      ? (isTelugu ? 'కెమెరా ఆఫ్ చేయబడింది' : 'Camera is muted')
                      : cameraState === 'simulated'
                      ? 'Simulated Studio Avatar Active'
                      : (isTelugu ? 'కెమెరా కనెక్ట్ అవుతోంది...' : 'Connecting camera feed...')}
                  </p>
                </div>
              )}

              {/* User Label Tag */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>You</span>
                {isMicMuted && <span style={{ color: '#ef4444' }}>🔇 Muted</span>}
                {isUserTalking && <span style={{ color: '#38bdf8' }}>🎙️ Talking...</span>}
              </div>

              {/* User Live Spoken Captions */}
              {userTranscript && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    color: '#38bdf8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  🗣️ "{userTranscript}"
                </div>
              )}
            </div>
          )}

          {/* AI PERSONA STAGE (Right 50% or Full Width in PiP mode) */}
          <div
            style={{
              flex: 1,
              borderRadius: layoutMode === 'split' ? '20px' : 0,
              background: layoutMode === 'split' ? '#090d1a' : 'transparent',
              border: layoutMode === 'split' ? '2px solid rgba(192, 132, 252, 0.3)' : 'none',
              boxShadow: layoutMode === 'split' ? '0 12px 35px rgba(0, 0, 0, 0.5)' : 'none',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Ambient Background Glow */}
            <div
              style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background: selectedPersona.glow,
                filter: 'blur(80px)',
                transform: `scale(${aiTalkingPulse})`,
                transition: 'transform 0.15s ease',
                pointerEvents: 'none',
              }}
            />

            {/* AI Avatar Portrait with Speaking Halo */}
            <div
              style={{
                position: 'relative',
                width: layoutMode === 'split' ? 150 : 180,
                height: layoutMode === 'split' ? 150 : 180,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: `3px solid ${selectedPersona.color}`,
                boxShadow: `0 0 35px ${selectedPersona.glow}`,
                transform: `scale(${aiTalkingPulse})`,
                transition: 'transform 0.12s ease',
                zIndex: 2,
              }}
            >
              <img
                src={selectedPersona.avatar}
                alt={selectedPersona.name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />

              {isSpeaking && (
                <div
                  style={{
                    position: 'absolute',
                    inset: -10,
                    borderRadius: '50%',
                    border: `2px dashed ${selectedPersona.color}`,
                    animation: 'spin 6s linear infinite',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>

            {/* Speaking Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '20px',
                background: isSpeaking ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: isSpeaking ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: isSpeaking ? '#38bdf8' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '12px',
                zIndex: 2,
              }}
            >
              {isSpeaking ? (
                <>
                  <Volume2 size={14} />
                  <span>{isTelugu ? 'AI సమాధానం చెబుతోంది...' : 'AI Speaking...'}</span>
                </>
              ) : isThinking ? (
                <>
                  <Sparkles size={14} />
                  <span>{isTelugu ? 'ఆలోచిస్తున్నారు...' : 'AI Thinking...'}</span>
                </>
              ) : (
                <>
                  <Activity size={14} />
                  <span>{isTelugu ? 'వీడియో కనెక్షన్ సిద్ధంగా ఉంది' : 'Video Audio Live'}</span>
                </>
              )}
            </div>

            {/* AI Live Subtitles Card */}
            {liveCaption && (
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 2,
                  textAlign: 'center',
                }}
              >
                "{liveCaption}"
              </div>
            )}

            {/* AI Name Tag */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.75)',
                padding: '4px 10px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {selectedPersona.name}
            </div>

            {/* PiP Floating Window (Only when in PiP mode) */}
            {layoutMode === 'pip' && (
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '200px',
                  height: '145px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#0f172a',
                  border: '2px solid rgba(56, 189, 248, 0.45)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <video
                  ref={userVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: isVideoMuted || cameraState !== 'active' ? 'none' : 'block',
                  }}
                />
                {(isVideoMuted || cameraState !== 'active') && (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Camera size={24} color="#38bdf8" />
                    <div style={{ fontSize: '0.74rem', marginTop: '4px', fontWeight: 600 }}>You (Live)</div>
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '6px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    color: '#fff',
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  You {isMicMuted && '🔇'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Call Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '14px 20px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 10,
            flexWrap: 'wrap',
          }}
        >
          {/* 1. Interactive Two-Way Talk Button */}
          <button
            type="button"
            onClick={handleStartTalking}
            style={{
              height: 48,
              padding: '0 18px',
              borderRadius: '24px',
              border: isUserTalking ? '2px solid #ef4444' : '2px solid #38bdf8',
              background: isUserTalking
                ? 'rgba(239, 68, 68, 0.3)'
                : 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(124, 58, 237, 0.3) 100%)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '0.88rem',
              boxShadow: isUserTalking ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 4px 15px rgba(56, 189, 248, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {isUserTalking ? (
              <>
                <Mic size={20} color="#f87171" className="spin" />
                <span>{isTelugu ? 'మాట్లాడండి...' : 'Listening... Speak'}</span>
              </>
            ) : (
              <>
                <Mic size={20} color="#38bdf8" />
                <span>{isTelugu ? 'మాట్లాడండి (Speak)' : 'Speak to AI'}</span>
              </>
            )}
          </button>

          {/* 2. Camera Toggle */}
          <button
            type="button"
            onClick={handleToggleCamera}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 'none',
              background: isVideoMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* 3. Screen Share */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 'none',
              background: isScreenSharing ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Share Screen"
          >
            <Share2 size={20} />
          </button>

          {/* 4. WhatsApp Video Call Invite Launcher */}
          {onOpenWhatsApp && (
            <button
              type="button"
              onClick={onOpenWhatsApp}
              style={{
                height: 48,
                padding: '0 16px',
                borderRadius: '24px',
                border: '1px solid rgba(37, 211, 102, 0.4)',
                background: 'rgba(37, 211, 102, 0.2)',
                color: '#4ade80',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              title="Invite contacts through WhatsApp"
            >
              <MessageSquare size={18} />
              <span>{isTelugu ? 'వాట్సాప్ ఆహ్వానం' : 'WhatsApp Invite'}</span>
            </button>
          )}

          {/* 5. End Video Call */}
          <button
            type="button"
            onClick={handleEndCall}
            style={{
              height: 48,
              padding: '0 22px',
              borderRadius: '24px',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
            }}
          >
            <PhoneOff size={18} />
            <span>{isTelugu ? 'కాల్ ముగించండి' : 'End Call'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIVideoCallModal;
