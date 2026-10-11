import React, { useState } from 'react';
import { Menu, Activity, PhoneCall, Globe } from 'lucide-react';
import VoiceStatus from './VoiceStatus';
import AICallModal from './AICallModal';
import { useVoice } from '../context/VoiceContext';

const Navbar = ({ onOpenSidebar }) => {
  const { language, setLanguage } = useVoice();
  const [showCallModal, setShowCallModal] = useState(false);

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

  const getShortLang = () => {
    if (isTelugu) return 'TE';
    if (isHindi) return 'HI';
    return 'EN';
  };

  return (
    <>
      <header className="mobile-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenSidebar}
            className="mobile-menu-btn"
            aria-label="Toggle navigation menu"
          >
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="brand-logo-icon" style={{ width: '30px', height: '30px' }}>
              <Activity size={17} color="#ffffff" />
            </div>
            <span className="brand-name" style={{ fontSize: '1.15rem' }}>VoxWeb</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Language Switcher: EN <-> TE <-> HI */}
          <button
            type="button"
            onClick={toggleLanguage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 9px',
              borderRadius: '8px',
              background: isTelugu || isHindi ? 'rgba(124, 58, 237, 0.25)' : 'rgba(56, 189, 248, 0.15)',
              border: isTelugu || isHindi ? '1px solid #8b5cf6' : '1px solid rgba(56, 189, 248, 0.4)',
              color: isTelugu || isHindi ? '#c084fc' : '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Switch Language (English / Telugu / Hindi)"
          >
            <Globe size={13} />
            <span>{getShortLang()}</span>
          </button>

          {/* Quick AI Call Button */}
          <button
            type="button"
            onClick={() => setShowCallModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2) 0%, rgba(124, 58, 237, 0.25) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Open AI Phone Dialer"
          >
            <PhoneCall size={13} />
            <span>Call</span>
          </button>

          <VoiceStatus />
        </div>
      </header>

      <AICallModal isOpen={showCallModal} onClose={() => setShowCallModal(false)} />
    </>
  );
};

export default Navbar;
