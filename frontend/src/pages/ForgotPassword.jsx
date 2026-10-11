import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, Activity, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import Waveform from '../components/Waveform';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Hidden/masked states (all hidden by default)
  const [showOtp, setShowOtp] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMsg(
        res.data?.message || `Verification OTP sent to ${email}. Please check your email inbox.`
      );
      setStep(2);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail || 'Failed to send OTP email. Please check the email address and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await api.post('/auth/reset-password', {
        email,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccessMsg('Password hashed & reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Invalid or expired OTP. Please check your email inbox and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Branding Side */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="brand-logo-icon">
            <Activity size={26} color="#ffffff" />
          </div>
          <span className="brand-name">VoxWeb</span>
        </div>

        <div className="auth-hero">
          <h1 className="auth-headline">
            Secure Account
            <br />
            <span>Recovery.</span>
          </h1>

          <p className="auth-description">
            Safely reset your VoxWeb password with SHA-256 hashed email verification codes and Bcrypt password encryption.
          </p>

          <div className="auth-features-grid">
            <div className="auth-feature-card">
              <div className="feat-icon">🔑</div>
              <h4>Email Inbox OTP</h4>
              <p>6-digit code sent directly to your email</p>
            </div>
            <div className="auth-feature-card">
              <div className="feat-icon">🛡️</div>
              <h4>Bcrypt Hashing</h4>
              <p>Passwords are hidden and never stored in plaintext</p>
            </div>
          </div>
        </div>

        <div className="auth-bottom-wave">
          <Waveform count={32} active={true} height={28} color="rgba(56, 189, 248, 0.85)" />
        </div>
      </div>

      {/* Right Form Side */}
      <div className="auth-right">
        <div className="auth-form-card">
          <h2 className="auth-card-title">Forgot Password?</h2>
          <p className="auth-card-subtitle">
            {step === 1
              ? "Enter your email address and we'll send a 6-digit OTP to your email inbox."
              : 'Enter the 6-digit verification OTP sent to your email inbox and choose a new password.'}
          </p>

          {errorMsg && (
            <div className="alert-box alert-error">
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box alert-success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-gradient-submit"
                style={{ marginTop: '1.5rem' }}
                disabled={isLoading}
              >
                <span>{isLoading ? 'Sending OTP to Email...' : 'Send Verification OTP to Email'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Enter 6-Digit Email OTP</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <KeyRound size={18} className="input-icon" />
                  <input
                    type={showOtp ? 'text' : 'password'}
                    required
                    maxLength={6}
                    className="form-input"
                    style={{ paddingRight: '42px', letterSpacing: '4px', fontWeight: 700 }}
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.trim())}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowOtp(!showOtp)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showOtp ? 'Hide OTP' : 'Show OTP'}
                  >
                    {showOtp ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    style={{ paddingRight: '42px' }}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    style={{ paddingRight: '42px' }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {newPassword && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#34d399',
                    marginTop: '4px',
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Bcrypt + SHA-256 password hashing active (hidden)</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-gradient-submit"
                style={{ marginTop: '1.25rem' }}
                disabled={isLoading}
              >
                <span>{isLoading ? 'Hashing & Resetting...' : 'Reset Password'}</span>
                <ArrowRight size={18} />
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background: 'transparent', color: 'var(--text-dim)', fontSize: '0.85rem' }}
                >
                  Resend OTP / Change Email
                </button>
              </div>
            </form>
          )}

          <div className="auth-bottom-switch">
            Remembered your password?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
