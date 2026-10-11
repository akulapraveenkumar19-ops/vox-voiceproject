import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, Calendar, Edit3, Key, LogOut, CheckCircle2, Award, Camera, UploadCloud, Trash2, Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import VoiceStatus from '../components/VoiceStatus';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { processAvatarFile } from '../services/imageUtils';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // File upload refs
  const directFileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total_commands: 0, ai_queries: 0, fast_actions: 0 });

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState(user?.name || '');
  const [editImage, setEditImage] = useState(user?.profile_image || '');

  // Password fields
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditImage(user.profile_image || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/users/stats');
        setStats(res.data);
      } catch (err) {
        // Fallback
      }
    };
    fetchStats();
  }, []);

  const handleDirectPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      setStatusMsg('');
      setErrorMsg('');
      const dataUrl = await processAvatarFile(file);
      const res = await api.put('/users/profile', {
        profile_image: dataUrl,
      });
      updateUser(res.data);
      setEditImage(dataUrl);
      setStatusMsg('Profile photo updated successfully!');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (directFileInputRef.current) directFileInputRef.current.value = '';
    }
  };

  const handleModalPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      setErrorMsg('');
      const dataUrl = await processAvatarFile(file);
      setEditImage(dataUrl);
    } catch (err) {
      setErrorMsg(err.message || 'Could not process selected image.');
    } finally {
      setIsUploadingPhoto(false);
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      setStatusMsg('');
      setErrorMsg('');
      const res = await api.put('/users/profile', {
        profile_image: '',
      });
      updateUser(res.data);
      setEditImage('');
      setStatusMsg('Profile photo removed.');
    } catch (err) {
      setErrorMsg('Failed to remove profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await api.put('/users/profile', {
        name: editName,
        profile_image: editImage,
      });
      updateUser(res.data);
      setStatusMsg('Profile successfully updated.');
      setShowEditModal(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    setStatusMsg('');
    setErrorMsg('');
    try {
      await api.post('/users/change-password', {
        current_password: curPassword,
        new_password: newPassword,
      });
      setStatusMsg('Password changed successfully.');
      setShowPwModal(false);
      setCurPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Incorrect current password.');
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : 'October 2026';

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

        <header className="dashboard-header">
          <div>
            <h1 className="header-greeting-title">User Profile</h1>
            <p className="header-greeting-sub">Manage your account preferences and credentials.</p>
          </div>
          <VoiceStatus />
        </header>

        {statusMsg && (
          <div className="alert-box alert-success" style={{ maxWidth: '800px', margin: '0 auto 1.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="profile-card-large">
          {/* Hidden File Input for Direct Browser Image Selection */}
          <input
            type="file"
            ref={directFileInputRef}
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleDirectPhotoUpload}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              className="profile-avatar-container"
              onClick={() => directFileInputRef.current?.click()}
              title="Click to select photo from your browser / computer"
            >
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.name}
                  className="profile-avatar-hero"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
                  }}
                />
              ) : (
                <div className="profile-avatar-hero">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <div className="profile-avatar-overlay">
                {isUploadingPhoto ? (
                  <Loader2 size={24} className="spin" />
                ) : (
                  <>
                    <Camera size={22} />
                    <span>Change Photo</span>
                  </>
                )}
              </div>

              <div className="profile-avatar-badge" title="Upload from Device">
                <Camera size={14} />
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => directFileInputRef.current?.click()}
                className="google-auth-btn"
                style={{ width: 'auto', padding: '8px 18px', fontSize: '0.85rem' }}
                disabled={isUploadingPhoto}
              >
                <Camera size={15} />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Choose Photo from Device'}</span>
              </button>

              {user?.profile_image && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="btn-danger-outline"
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  disabled={isUploadingPhoto}
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '4px' }}>
              {user?.name || 'Alex Morgan'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <Award size={16} />
              <span>{user?.account_type || 'Voice Pro'} Plan</span>
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              margin: '1.5rem 0',
            }}
          >
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', marginBottom: '6px', fontSize: '0.85rem' }}>
                <Mail size={16} />
                <span>Email Address</span>
              </div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                {user?.email || 'alex@example.com'}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', marginBottom: '6px', fontSize: '0.85rem' }}>
                <Shield size={16} />
                <span>Auth Provider</span>
              </div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', textTransform: 'capitalize' }}>
                {user?.auth_provider || 'Email / Password'}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', marginBottom: '6px', fontSize: '0.85rem' }}>
                <Calendar size={16} />
                <span>Member Since</span>
              </div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                {memberSince}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              textAlign: 'center',
              margin: '1.5rem 0',
            }}
          >
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                {stats.total_commands}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Commands</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                {stats.ai_queries}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI Questions</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {stats.fast_actions}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fast Actions</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            <button
              onClick={() => {
                setEditName(user?.name || '');
                setEditImage(user?.profile_image || '');
                setShowEditModal(true);
              }}
              className="google-auth-btn"
              style={{ width: 'auto', padding: '10px 20px' }}
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setShowPwModal(true)}
              className="google-auth-btn"
              style={{ width: 'auto', padding: '10px 20px' }}
            >
              <Key size={16} />
              <span>Change Password</span>
            </button>

            <button
              onClick={logout}
              className="btn-danger-outline"
              style={{ padding: '10px 20px' }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Modal: Edit Profile */}
        {showEditModal && (
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
            onClick={() => setShowEditModal(false)}
          >
            <div
              className="glass-panel"
              style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '1.5rem' }}>Edit Profile</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '14px' }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Profile Photo</label>
                  <input
                    type="file"
                    ref={modalFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleModalPhotoSelect}
                    style={{ display: 'none' }}
                  />

                  {/* Dropzone / Click to choose from browser */}
                  <div
                    className="avatar-upload-dropzone"
                    onClick={() => modalFileInputRef.current?.click()}
                    title="Click to select image file from browser"
                  >
                    {editImage ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                        <img
                          src={editImage}
                          alt="Avatar Preview"
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--accent-purple)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          }}
                        />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                            Photo Selected
                          </div>
                          <div style={{ color: 'var(--accent-blue)', fontSize: '0.8rem' }}>
                            Click to change photo
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditImage('');
                          }}
                          className="btn-danger-outline"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          title="Clear photo"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={30} color="var(--accent-purple)" />
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                          Select Photo from Browser / Device
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          Supports JPG, PNG, WebP
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', color: '#fff' }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-gradient-submit" style={{ width: 'auto', padding: '10px 20px' }}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Change Password */}
        {showPwModal && (
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
            onClick={() => setShowPwModal(false)}
          >
            <div
              className="glass-panel"
              style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '1.5rem' }}>Change Password</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    style={{ paddingLeft: '14px' }}
                    value={curPassword}
                    onChange={(e) => setCurPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    style={{ paddingLeft: '14px' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    style={{ paddingLeft: '14px' }}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowPwModal(false)}
                    style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', color: '#fff' }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-gradient-submit" style={{ width: 'auto', padding: '10px 20px' }}>
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
