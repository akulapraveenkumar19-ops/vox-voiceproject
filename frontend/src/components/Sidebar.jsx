import React, { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, History, User, Settings, LogOut, Activity, X, Camera, Loader2, StickyNote, Video, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Waveform from './Waveform';
import api from '../services/api';
import { processAvatarFile } from '../services/imageUtils';
import VoiceNotesModal from './VoiceNotesModal';
import AIVideoCallModal from './AIVideoCallModal';
import WhatsAppAccountModal from './WhatsAppAccountModal';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Home', icon: <Home size={20} /> },
    { to: '/history', label: 'Chat History', icon: <History size={20} /> },
    { to: '/profile', label: 'Profile', icon: <User size={20} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const dataUrl = await processAvatarFile(file);
      const res = await api.put('/users/profile', {
        profile_image: dataUrl,
      });
      updateUser(res.data);
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 35,
          }}
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div>
          {/* Header Brand */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <NavLink to="/dashboard" className="sidebar-brand" onClick={onClose}>
              <div className="brand-logo-icon">
                <Activity size={24} color="#ffffff" />
              </div>
              <span className="brand-name">VoxWeb</span>
            </NavLink>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="btn-icon-control"
              style={{ display: isOpen ? 'flex' : 'none' }}
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => {
                setShowNotesModal(true);
                onClose();
              }}
              className="nav-link"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <StickyNote size={20} />
              <span>Voice Notes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowVideoModal(true);
                onClose();
              }}
              className="nav-link"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#38bdf8' }}
            >
              <Video size={20} />
              <span>AI Video Call</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowWhatsAppModal(true);
                onClose();
              }}
              className="nav-link"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#4ade80' }}
            >
              <MessageSquare size={20} />
              <span>WhatsApp Hub</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section */}
        <div>
          {/* Hidden File Input for Browser Image Selection */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleAvatarSelect}
            style={{ display: 'none' }}
          />

          {/* User Profile Card */}
          {user && (
            <div className="sidebar-user-card">
              {/* Interactive Avatar with Camera Badge */}
              <div
                className="user-avatar-wrapper"
                onClick={() => fileInputRef.current?.click()}
                title="Select Profile Photo from Browser"
              >
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.name}
                    className="user-avatar-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
                    }}
                  />
                ) : (
                  <div className="user-avatar-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                <div className="avatar-camera-badge" title="Select photo from device">
                  {isUploading ? (
                    <Loader2 size={10} className="spin" color="#ffffff" />
                  ) : (
                    <Camera size={10} color="#ffffff" />
                  )}
                </div>
              </div>

              {/* User Info Details */}
              <div
                className="user-info-text"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  navigate('/profile');
                  onClose();
                }}
                title="View Profile Settings"
              >
                <div className="user-info-name">{user.name || 'Alex Morgan'}</div>
                <div className="user-info-role">{user.account_type || 'Voice Pro'}</div>
              </div>

              {/* Explicit Browser File Picker Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-icon-control"
                style={{ padding: '6px', color: 'var(--accent-blue)', background: 'transparent' }}
                title="Choose photo from device"
                aria-label="Upload photo from browser"
              >
                <Camera size={16} />
              </button>
            </div>
          )}

          {/* Logout Button */}
          <button onClick={handleLogout} className="btn-sidebar-logout" aria-label="Log Out">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <VoiceNotesModal isOpen={showNotesModal} onClose={() => setShowNotesModal(false)} />
      <AIVideoCallModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onOpenWhatsApp={() => {
          setShowVideoModal(false);
          setShowWhatsAppModal(true);
        }}
      />
      <WhatsAppAccountModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onLaunchVideoCall={() => {
          setShowWhatsAppModal(false);
          setShowVideoModal(true);
        }}
      />
    </>
  );
};

export default Sidebar;
