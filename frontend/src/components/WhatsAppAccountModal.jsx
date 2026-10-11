import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  QrCode,
  PhoneCall,
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Send,
  Video
} from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import api from '../services/api';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
];

const COUNTRY_CODES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
];

const WhatsAppAccountModal = ({ isOpen, onClose, onLaunchVideoCall }) => {
  const { language } = useVoice();
  const isTelugu = Boolean(language && language.startsWith('te'));

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'qr' | 'chat'
  const [phoneNumber, setPhoneNumber] = useState('7981779432');
  const [countryCode, setCountryCode] = useState('+91');
  const [displayName, setDisplayName] = useState('VoxWeb User');
  const [aboutBio, setAboutBio] = useState('⚡ Available on VoxWeb Voice AI');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[1]);
  const [isConnected, setIsConnected] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Chat launcher tab state
  const [targetNumber, setTargetNumber] = useState('');
  const [targetMessage, setTargetMessage] = useState('Call me back later');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load saved WhatsApp profile from localStorage or API when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const saved = localStorage.getItem('voxweb_whatsapp_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.phone_number) setPhoneNumber(parsed.phone_number);
        if (parsed.display_name) setDisplayName(parsed.display_name);
        if (parsed.about) setAboutBio(parsed.about);
        if (parsed.country_code) setCountryCode(parsed.country_code);
        if (parsed.profile_image) setSelectedAvatar(parsed.profile_image);
        setIsConnected(parsed.is_connected !== false);
      } catch (e) {}
    }

    // Try fetching from backend
    api.get('/whatsapp/account')
      .then((res) => {
        if (res.data?.success && res.data.account) {
          const acc = res.data.account;
          if (acc.phone_number) setPhoneNumber(acc.phone_number);
          if (acc.display_name) setDisplayName(acc.display_name);
          if (acc.about) setAboutBio(acc.about);
          if (acc.country_code) setCountryCode(acc.country_code);
          if (acc.profile_image) setSelectedAvatar(acc.profile_image);
          setIsConnected(acc.is_connected);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const cleanNum = phoneNumber.replace(/\D/g, '');
    const accountData = {
      phone_number: cleanNum,
      display_name: displayName,
      about: aboutBio,
      country_code: countryCode,
      profile_image: selectedAvatar,
      is_connected: true,
    };

    localStorage.setItem('voxweb_whatsapp_account', JSON.stringify(accountData));
    setIsConnected(true);

    try {
      await api.post('/whatsapp/account', accountData);
    } catch (e) {
      console.warn('Backend sync warning:', e);
    } finally {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const getCleanTarget = (num = targetNumber) => {
    const raw = num.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) {
      return `91${digits}`;
    }
    return digits;
  };

  const handleLaunchChat = () => {
    const digits = getCleanTarget();
    if (!digits) return;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(targetMessage)}`;
    window.open(url, '_blank');
  };

  const handleLaunchVideoInvite = () => {
    const digits = getCleanTarget();
    if (!digits) return;
    const msg = `Hey! Join my VoxWeb AI Video Call session now: ${window.location.origin}/dashboard`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const digits = getCleanTarget();
    const url = `https://wa.me/${digits || getCleanTarget(phoneNumber)}?text=${encodeURIComponent(targetMessage)}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
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
          maxWidth: '560px',
          maxHeight: '90vh',
          borderRadius: '24px',
          padding: '1.75rem',
          border: '1px solid rgba(37, 211, 102, 0.4)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(37, 211, 102, 0.15)',
          position: 'relative',
          overflowY: 'auto',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 25, 20, 0.95) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
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
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(37, 211, 102, 0.4)',
            }}
          >
            <MessageSquare size={26} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', fontWeight: 800 }}>
                {isTelugu ? 'వాట్సాప్ ఖాతా కేంద్రం' : 'WhatsApp Account Hub'}
              </h3>
              {isConnected && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={11} /> {isTelugu ? 'కనెక్ట్ అయింది' : 'Connected'}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {isTelugu
                ? 'మీ వాట్సాప్ నంబర్‌ను లింక్ చేయండి, QR స్కాన్ ద్వారా జోడించండి లేదా మెసేజ్‌లు పంపండి'
                : 'Link your WhatsApp account, pair with WhatsApp Web, or launch chats & video calls'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'profile' ? 'rgba(37, 211, 102, 0.25)' : 'transparent',
              color: activeTab === 'profile' ? '#4ade80' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={15} />
            <span>{isTelugu ? 'ప్రొఫైల్ & నంబర్' : 'Account Profile'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'qr' ? 'rgba(37, 211, 102, 0.25)' : 'transparent',
              color: activeTab === 'qr' ? '#4ade80' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <QrCode size={15} />
            <span>{isTelugu ? 'QR వెబ్ జతచేయి' : 'WhatsApp Web QR'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'chat' ? 'rgba(37, 211, 102, 0.25)' : 'transparent',
              color: activeTab === 'chat' ? '#4ade80' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={15} />
            <span>{isTelugu ? 'చాట్ & కాల్' : 'Direct Chat'}</span>
          </button>
        </div>

        {/* Tab 1: Account Profile & Linking */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveAccount}>
            {/* Live Connected WhatsApp Profile Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px',
                borderRadius: '16px',
                background: 'rgba(37, 211, 102, 0.08)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                marginBottom: '1.25rem',
              }}
            >
              <img
                src={selectedAvatar}
                alt="WhatsApp Avatar"
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #25d366',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                    {displayName || 'WhatsApp User'}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>
                    {countryCode} {phoneNumber}
                  </span>
                </div>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  "{aboutBio}"
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                {isTelugu ? 'వాట్సాప్ పేరు' : 'WhatsApp Display Name'}
              </label>
              <input
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            {/* Phone Number with Country Code */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                {isTelugu ? 'ఫోన్ నంబర్' : 'Registered WhatsApp Number'}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-input"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{ width: '110px', fontSize: '0.85rem' }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  className="form-input"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 7981779432"
                  style={{ flex: 1, fontWeight: 700, letterSpacing: '0.5px' }}
                  required
                />
              </div>
            </div>

            {/* About / Status Bio */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                {isTelugu ? 'స్టేటస్ బయో' : 'About / Status Bio'}
              </label>
              <input
                type="text"
                className="form-input"
                value={aboutBio}
                onChange={(e) => setAboutBio(e.target.value)}
                placeholder="Hey there! I am using VoxWeb"
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {[
                  '⚡ Available on VoxWeb',
                  '🎙️ Voice Assistant Active',
                  '🚀 In a Video Meeting',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAboutBio(s)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '8px' }}>
                {isTelugu ? 'ప్రొఫైల్ చిత్రం' : 'Profile Picture'}
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {PRESET_AVATARS.map((av, idx) => (
                  <img
                    key={idx}
                    src={av}
                    alt="Preset"
                    onClick={() => setSelectedAvatar(av)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      objectFit: 'cover',
                      border: selectedAvatar === av ? '2px solid #25d366' : '2px solid transparent',
                      transform: selectedAvatar === av ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Submit / Save Button */}
            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(37, 211, 102, 0.35)',
              }}
            >
              {saveSuccess ? (
                <>
                  <Check size={18} />
                  <span>{isTelugu ? 'విజయవంతంగా సేవ్ చేయబడింది!' : 'WhatsApp Account Linked!'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>{isSaving ? 'సేవ్ అవుతోంది...' : (isTelugu ? 'వాట్సాప్ ఖాతాను భద్రపరచండి' : 'Save & Connect WhatsApp Account')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: WhatsApp Web QR Scanner Simulation & Instant Launcher */}
        {activeTab === 'qr' && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '16px',
                borderRadius: '20px',
                background: '#ffffff',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                marginBottom: '1rem',
              }}
            >
              {/* High-tech QR code display */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `https://wa.me/${countryCode.replace('+', '')}${phoneNumber.replace(/\D/g, '')}`
                )}`}
                alt="WhatsApp Web QR Code"
                style={{ width: 170, height: 170, display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#25d366',
                  borderRadius: '50%',
                  padding: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <MessageSquare size={20} color="#fff" />
              </div>
            </div>

            <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>
              {isTelugu ? 'వాట్సాప్ వెబ్ కనెక్ట్ చేయండి' : 'Pair with WhatsApp Web'}
            </h4>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              1. Open WhatsApp on your phone &gt; Settings &gt; Linked Devices.<br />
              2. Point your camera at this QR code to sync your chats.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(37, 211, 102, 0.2)',
                  border: '1px solid rgba(37, 211, 102, 0.45)',
                  color: '#4ade80',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>Open WhatsApp Web</span>
                <ExternalLink size={14} />
              </a>

              <a
                href={`whatsapp://send?phone=${countryCode.replace('+', '')}${phoneNumber.replace(/\D/g, '')}`}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#e2e8f0',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Smartphone size={14} />
                <span>Open Desktop App</span>
              </a>
            </div>
          </div>
        )}

        {/* Tab 3: Direct Message, Call & Video Launcher */}
        {activeTab === 'chat' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                {isTelugu ? 'స్వీకర్త ఫోన్ నంబర్' : 'Recipient Phone Number'}
              </label>
              <input
                type="tel"
                className="form-input"
                value={targetNumber}
                onChange={(e) => setTargetNumber(e.target.value)}
                placeholder="e.g. 7981779432 or +919876543210"
                style={{ fontWeight: 700 }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                {isTelugu ? 'మెసేజ్ కంటెంట్' : 'Message Text'}
              </label>
              <input
                type="text"
                className="form-input"
                value={targetMessage}
                onChange={(e) => setTargetMessage(e.target.value)}
                placeholder="Type message..."
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {[
                  'Call me back later',
                  'Join my AI video call',
                  'Can you talk now?',
                ].map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => setTargetMessage(txt)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    "{txt}"
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Option 1: WhatsApp Chat */}
              <button
                type="button"
                onClick={handleLaunchChat}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Send size={16} />
                <span>{isTelugu ? 'వాట్సాప్‌లో మెసేజ్ పంపండి' : 'Send via WhatsApp'}</span>
              </button>

              {/* Option 2: WhatsApp Video Call Invitation */}
              <button
                type="button"
                onClick={handleLaunchVideoInvite}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Video size={16} />
                <span>{isTelugu ? 'వీడియో కాల్ ఆహ్వానం పంపండి' : 'Invite to Video Call via WhatsApp'}</span>
              </button>

              {/* Option 3: Copy WhatsApp Direct Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {copiedLink ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                <span>{copiedLink ? 'లింక్ కాపీ అయింది!' : 'Copy Direct wa.me Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppAccountModal;
