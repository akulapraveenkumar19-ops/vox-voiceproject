import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, History, User, Settings, Mic, Square, Volume2 } from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    stopSpeaking,
  } = useVoice();

  // Hide on unauthenticated pages
  const authPaths = ['/login', '/register', '/forgot-password', '/auth/google/callback'];
  if (!user || authPaths.includes(location.pathname)) {
    return null;
  }

  const handleMicTap = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `mobile-bottom-tab ${isActive ? 'active' : ''}`}
      >
        <Home size={20} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/history"
        className={({ isActive }) => `mobile-bottom-tab ${isActive ? 'active' : ''}`}
      >
        <History size={20} />
        <span>History</span>
      </NavLink>

      {/* Center Floating Voice Assistant Mic Button */}
      <div className="mobile-bottom-mic-slot">
        <button
          type="button"
          onClick={handleMicTap}
          className={`mobile-bottom-mic-btn ${
            isListening ? 'listening' : isSpeaking ? 'speaking' : ''
          }`}
          aria-label={isListening ? 'Stop voice listening' : 'Speak voice command'}
        >
          {isListening ? (
            <Square size={22} fill="currentColor" />
          ) : isSpeaking ? (
            <Volume2 size={24} />
          ) : (
            <Mic size={24} />
          )}
        </button>
        <span className="mobile-bottom-mic-label">
          {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Speak'}
        </span>
      </div>

      <NavLink
        to="/profile"
        className={({ isActive }) => `mobile-bottom-tab ${isActive ? 'active' : ''}`}
      >
        <User size={20} />
        <span>Profile</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) => `mobile-bottom-tab ${isActive ? 'active' : ''}`}
      >
        <Settings size={20} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
};

export default MobileBottomNav;
