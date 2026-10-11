import React, { useState } from 'react';
import { Globe, Search, Clock, ArrowRight, Play, CloudSun, StickyNote, Music, PhoneCall, Video, MessageSquare, Brain, Languages } from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import VoiceNotesModal from './VoiceNotesModal';
import AICallModal from './AICallModal';

const YouTubeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const QuickActions = ({ onOpenVideoCall, onOpenWhatsApp, onOpenLLMStudio, onOpenSmartTools }) => {
  const { executeCommand, language } = useVoice();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherCity, setWeatherCity] = useState('');

  const isTelugu = Boolean(language && language.startsWith('te'));

  const actions = [
    {
      id: 'llmstudio',
      title: isTelugu ? 'Multi-LLM స్టూడియో' : 'Multi-LLM Studio',
      desc: isTelugu ? 'AI మోడల్స్ & వాయిస్' : 'Switch LLMs & Personas',
      icon: <Brain size={24} color="#a5b4fc" />,
      iconClass: 'icon-search',
      onClick: () => (onOpenLLMStudio ? onOpenLLMStudio() : executeCommand('Explain how LLMs work')),
    },
    {
      id: 'smarttools',
      title: isTelugu ? 'అనువాదం & టైమర్' : 'Translator & Timers',
      desc: isTelugu ? 'భాషా అనువాదం & మాక్రోస్' : 'Translate, Pomodoro, Macros',
      icon: <Languages size={24} color="#22d3ee" />,
      iconClass: 'icon-clock',
      onClick: () => (onOpenSmartTools ? onOpenSmartTools() : executeCommand('set a timer for 5 minutes')),
    },
    {
      id: 'videocall',
      title: isTelugu ? 'AI వీడియో కాల్' : 'AI Video Call',
      desc: isTelugu ? 'ముఖాముఖి AI సంభాషణ' : 'Talk with live avatar',
      icon: <Video size={24} color="#38bdf8" />,
      iconClass: 'icon-google',
      onClick: () => onOpenVideoCall ? onOpenVideoCall() : executeCommand('start video call'),
    },
    {
      id: 'whatsapp',
      title: isTelugu ? 'వాట్సాప్ ఖాతా' : 'WhatsApp Account',
      desc: isTelugu ? 'లింక్ & QR వెబ్ జతచేయి' : 'Link profile & QR pair',
      icon: <MessageSquare size={24} color="#25d366" />,
      iconClass: 'icon-google',
      onClick: () => onOpenWhatsApp ? onOpenWhatsApp() : executeCommand('open whatsapp account'),
    },
    {
      id: 'aicall',
      title: isTelugu ? 'AI కాల్ & డయలర్' : 'AI Call & Dial',
      desc: isTelugu ? 'ఏ నంబర్‌కైనా కాల్ చేయండి' : 'Call any device',
      icon: <PhoneCall size={24} />,
      iconClass: 'icon-google',
      onClick: () => setShowCallModal(true),
    },
    {
      id: 'youtube',
      title: isTelugu ? 'యూట్యూబ్ ప్లే' : 'Play on YouTube',
      desc: isTelugu ? 'సంగీతం & వీడియోలు' : 'Music & videos',
      icon: <YouTubeIcon />,
      iconClass: 'icon-youtube',
      onClick: () => executeCommand(isTelugu ? 'play telugu songs on youtube' : 'play lo-fi hip hop on youtube'),
    },
    {
      id: 'weather',
      title: isTelugu ? 'ప్రత్యక్ష వాతావరణం' : 'Live Weather',
      desc: isTelugu ? 'ఉష్ణోగ్రత తనిఖీ చేయండి' : 'Check temperature',
      icon: <CloudSun size={24} />,
      iconClass: 'icon-google',
      onClick: () => setShowWeatherModal(true),
    },
    {
      id: 'notes',
      title: isTelugu ? 'వాయిస్ నోట్స్' : 'Voice Notes',
      desc: isTelugu ? 'జ్ఞాపికల జాబితా' : 'Reminders list',
      icon: <StickyNote size={24} />,
      iconClass: 'icon-clock',
      onClick: () => setShowNotesModal(true),
    },
    {
      id: 'search',
      title: isTelugu ? 'వెబ్ శోధన' : 'Search Web',
      desc: isTelugu ? 'గూగుల్ అన్వేషణ' : 'Google & explore',
      icon: <Search size={24} />,
      iconClass: 'icon-search',
      onClick: () => setShowSearchModal(true),
    },
    {
      id: 'clock',
      title: isTelugu ? 'ప్రస్తుత సమయం' : 'Current Time',
      desc: isTelugu ? 'సమయం & తేదీ' : 'Check clock & date',
      icon: <Clock size={24} />,
      iconClass: 'icon-clock',
      onClick: () => executeCommand(isTelugu ? 'సమయం ఎంత' : 'What time is it?'),
    },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      executeCommand(`Search Google for ${searchQuery.trim()}`);
      setSearchQuery('');
      setShowSearchModal(false);
    }
  };

  const handleWeatherSubmit = (e) => {
    e.preventDefault();
    if (weatherCity.trim()) {
      executeCommand(`Weather in ${weatherCity.trim()}`);
      setWeatherCity('');
      setShowWeatherModal(false);
    }
  };

  return (
    <section className="quick-actions-section">
      <div className="section-label">Quick Voice Actions</div>
      <div className="quick-actions-grid">
        {actions.map((act) => (
          <div
            key={act.id}
            className="action-card"
            onClick={act.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && act.onClick()}
          >
            <div className={`action-icon-box ${act.iconClass}`}>
              {act.icon}
            </div>
            <div className="action-details">
              <h3>{act.title}</h3>
              <p>{act.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Voice Notes Modal */}
      <VoiceNotesModal isOpen={showNotesModal} onClose={() => setShowNotesModal(false)} />

      {/* AI Call & Device Dial Modal */}
      <AICallModal isOpen={showCallModal} onClose={() => setShowCallModal(false)} />

      {/* Modal for Google Search */}
      {showSearchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '2rem',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '8px' }}>Search Google</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              What would you like VoxWeb to search for?
            </p>
            <form onSubmit={handleSearchSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  placeholder="e.g. Python tutorials, React hooks, AI news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gradient-submit"
                  style={{ width: 'auto', padding: '10px 22px' }}
                >
                  <span>Search</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Live Weather */}
      {showWeatherModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setShowWeatherModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '2rem',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '8px' }}>Live Weather Forecast</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Enter any city name to check live weather:
            </p>
            <form onSubmit={handleWeatherSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '16px' }}
                  placeholder="e.g. New York, London, Tokyo, Hyderabad..."
                  value={weatherCity}
                  onChange={(e) => setWeatherCity(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowWeatherModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gradient-submit"
                  style={{ width: 'auto', padding: '10px 22px' }}
                >
                  <span>Check Weather</span>
                  <CloudSun size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default QuickActions;
