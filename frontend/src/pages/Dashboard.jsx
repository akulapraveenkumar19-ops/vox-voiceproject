import React, { useState } from 'react';
import { PhoneCall, Globe, Video, MessageSquare, Brain, Wrench, Smartphone } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import VoiceStatus from '../components/VoiceStatus';
import QuickActions from '../components/QuickActions';
import AudioVisualizerHUD from '../components/AudioVisualizerHUD';
import Chat from '../components/Chat';
import AICallModal from '../components/AICallModal';
import AIVideoCallModal from '../components/AIVideoCallModal';
import WhatsAppAccountModal from '../components/WhatsAppAccountModal';
import LLMStudioModal from '../components/LLMStudioModal';
import SmartToolsModal from '../components/SmartToolsModal';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { language, setLanguage, mobileAppMode, setMobileAppMode } = useVoice();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showLLMStudioModal, setShowLLMStudioModal] = useState(false);
  const [showSmartToolsModal, setShowSmartToolsModal] = useState(false);

  const userName = user?.name ? user.name.split(' ')[0] : 'Friend';
  const isTelugu = language && language.startsWith('te');
  const isHindi = language && language.startsWith('hi');

  const toggleLanguage = () => {
    if (isTelugu) {
      setLanguage('hi-IN');
    } else if (isHindi) {
      setLanguage('en-US');
    } else {
      setLanguage('te-IN');
    }
  };

  const getLangLabel = () => {
    if (isTelugu) return 'తెలుగు (Telugu)';
    if (isHindi) return 'हिन्दी (Hindi)';
    return 'English (US)';
  };

  return (
    <div className="app-container">
      {/* Sidebar for Desktop & Collapsible Drawer for Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Mobile Navigation Header */}
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Dashboard Top Greeting Header */}
        <header className="dashboard-header">
          <div>
            <h1 className="header-greeting-title">
              {isTelugu
                ? `నమస్కారం, ${userName}! 👋`
                : isHindi
                ? `नमस्ते, ${userName}! 👋`
                : `Hello, ${userName}! 👋`}
            </h1>
            <p className="header-greeting-sub">
              {isTelugu
                ? 'మీ వోక్స్ వెబ్ AI అసిస్టెంట్ సిద్ధంగా ఉంది. ఏదైనా అడగండి లేదా మాట్లాడండి!'
                : isHindi
                ? 'आपका VoxWeb AI वॉइस असिस्टेंट तैयार है। अपनी आवाज़ में कुछ भी पूछें!'
                : 'Your Multi-LLM human voice assistant is online. Speak naturally, ask anything, or automate your web!'}
            </p>
          </div>

          {/* Action buttons on header */}
          <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Mobile App View Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileAppMode(!mobileAppMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: mobileAppMode
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.25) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.55)',
                color: mobileAppMode ? '#041410' : '#34d399',
                fontSize: '0.83rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
              }}
              title="Toggle Mobile App Responsive View"
            >
              <Smartphone size={15} />
              <span>{mobileAppMode ? 'Desktop View' : 'Mobile App'}</span>
            </button>
            {/* Multi-LLM Studio Launcher */}
            <button
              type="button"
              onClick={() => setShowLLMStudioModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(168, 85, 247, 0.3) 100%)',
                border: '1px solid rgba(129, 140, 248, 0.5)',
                color: '#e0e7ff',
                fontSize: '0.83rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.22)',
              }}
              title="Open Multi-LLM & Human Voice Studio"
            >
              <Brain size={16} color="#a5b4fc" />
              <span>LLM Studio</span>
            </button>

            {/* Smart Voice Toolkit Launcher */}
            <button
              type="button"
              onClick={() => setShowSmartToolsModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.16)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: '#67e8f9',
                fontSize: '0.83rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Translator, Timers & Custom Voice Shortcuts"
            >
              <Wrench size={15} color="#22d3ee" />
              <span>Smart Tools</span>
            </button>

            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: isTelugu || isHindi ? 'rgba(124, 58, 237, 0.25)' : 'rgba(56, 189, 248, 0.12)',
                border: isTelugu || isHindi ? '1px solid #8b5cf6' : '1px solid rgba(56, 189, 248, 0.35)',
                color: isTelugu || isHindi ? '#c084fc' : '#38bdf8',
                fontSize: '0.83rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Switch Voice Language (English / Telugu / Hindi)"
            >
              <Globe size={16} />
              <span>{getLangLabel()}</span>
            </button>

            {/* AI Call Launcher Button */}
            <button
              type="button"
              onClick={() => setShowCallModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(124, 58, 237, 0.3) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#fff',
                fontSize: '0.83rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <PhoneCall size={15} color="var(--accent-blue)" />
              <span>{isTelugu ? 'AI కాల్' : 'AI Call'}</span>
            </button>

            {/* AI Video Call Launcher Button */}
            <button
              type="button"
              onClick={() => setShowVideoCallModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.35) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                color: '#fff',
                fontSize: '0.83rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Video size={15} color="#38bdf8" />
              <span>{isTelugu ? 'వీడియో కాల్' : 'Video Call'}</span>
            </button>

            {/* WhatsApp Hub Launcher Button */}
            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.2) 0%, rgba(18, 140, 126, 0.3) 100%)',
                border: '1px solid rgba(37, 211, 102, 0.5)',
                color: '#4ade80',
                fontSize: '0.83rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={15} color="#25d366" />
              <span>{isTelugu ? 'వాట్సాప్' : 'WhatsApp'}</span>
            </button>

            <div className="desktop-status-wrapper">
              <VoiceStatus />
            </div>
          </div>
        </header>

        {/* Audio Visualizer & Multi-Workspace HUD */}
        <AudioVisualizerHUD
          onOpenVideoCall={() => setShowVideoCallModal(true)}
          onOpenWhatsApp={() => setShowWhatsAppModal(true)}
          onOpenLLMStudio={() => setShowLLMStudioModal(true)}
          onOpenSmartTools={() => setShowSmartToolsModal(true)}
        />

        {/* Quick Action Cards */}
        <QuickActions
          onOpenVideoCall={() => setShowVideoCallModal(true)}
          onOpenWhatsApp={() => setShowWhatsAppModal(true)}
          onOpenLLMStudio={() => setShowLLMStudioModal(true)}
          onOpenSmartTools={() => setShowSmartToolsModal(true)}
        />

        {/* Voice Assistant Chat Conversation Hub */}
        <div className="dashboard-main-grid">
          <Chat
            onOpenVideoCall={() => setShowVideoCallModal(true)}
            onOpenWhatsApp={() => setShowWhatsAppModal(true)}
            onOpenLLMStudio={() => setShowLLMStudioModal(true)}
          />
        </div>
      </div>

      {/* AI Call Modal */}
      <AICallModal isOpen={showCallModal} onClose={() => setShowCallModal(false)} />

      {/* AI Live Video Call Modal */}
      <AIVideoCallModal
        isOpen={showVideoCallModal}
        onClose={() => setShowVideoCallModal(false)}
        onOpenWhatsApp={() => {
          setShowVideoCallModal(false);
          setShowWhatsAppModal(true);
        }}
      />

      {/* WhatsApp Account & Pairing Modal */}
      <WhatsAppAccountModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onLaunchVideoCall={() => {
          setShowWhatsAppModal(false);
          setShowVideoCallModal(true);
        }}
      />

      {/* Multi-LLM & Human Voice AI Studio Modal */}
      <LLMStudioModal
        isOpen={showLLMStudioModal}
        onClose={() => setShowLLMStudioModal(false)}
      />

      {/* Smart Tools Modal (Translator, Timers, Voice Shortcuts) */}
      <SmartToolsModal
        isOpen={showSmartToolsModal}
        onClose={() => setShowSmartToolsModal(false)}
      />
    </div>
  );
};

export default Dashboard;
