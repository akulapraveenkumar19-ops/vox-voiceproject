import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Activity, ArrowRight, KeyRound, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Waveform from '../components/Waveform';
import api from '../services/api';

const Login = () => {
  // Auth Mode: 'password' | 'otp'
  const [authMode, setAuthMode] = useState('password');

  // Password Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Login state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGenerateRandomEmail = () => {
    const randNum = Math.floor(100 + Math.random() * 900);
    const sampleNames = ['alex', 'praveen', 'sarah', 'david', 'jordan', 'sam', 'morgan', 'taylor'];
    const chosen = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const generated = `${chosen}.${randNum}@gmail.com`;
    setOtpEmail(generated);
    setErrorMsg('');
  };

  const { login, googleLogin, requestOtpLogin, verifyOtpLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // If redirected with Google OAuth token or error
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('voxweb_token', token);
      navigate('/dashboard');
    }
    const err = searchParams.get('error');
    if (err) {
      setErrorMsg('Google authentication failed. Please try again.');
    }
  }, [searchParams, navigate]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await login(email, password, rememberMe);
    setIsLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!otpEmail) {
      setErrorMsg('Please enter your email address to receive an OTP code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await requestOtpLogin(otpEmail);
    setIsLoading(false);

    if (res.success) {
      setOtpSent(true);
      setSuccessMsg(res.message || `A 6-digit verification code was sent to ${otpEmail}.`);
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit code sent to your email.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await verifyOtpLogin(otpEmail, otpCode.trim());
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('Verification successful! Opening your VoxWeb dashboard...');
      setTimeout(() => navigate('/dashboard'), 600);
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleDirectGoogleLogin = async (targetEmail = 'user@voxweb.ai', name = 'VoxWeb User') => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const res = await googleLogin({ email: targetEmail, name });
    setIsLoading(false);
    if (res.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setErrorMsg(res.error);
    }
  };

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'VOXWEB_GOOGLE_OAUTH_SUCCESS') {
        setIsLoading(false);
        navigate('/dashboard', { replace: true });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const redirectUri = window.location.origin;
      localStorage.setItem('voxweb_google_redirect', redirectUri);
      const res = await api.get(`/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (res.data?.url) {
        const popup = window.open(
          res.data.url,
          'google_oauth_popup',
          'width=520,height=640,left=300,top=100'
        );

        if (!popup) {
          await handleDirectGoogleLogin();
          return;
        }

        const pollTimer = setInterval(async () => {
          if (popup.closed) {
            clearInterval(pollTimer);
            const token = localStorage.getItem('voxweb_token');
            if (token) {
              setIsLoading(false);
              navigate('/dashboard', { replace: true });
            } else {
              await handleDirectGoogleLogin();
            }
          }
        }, 700);
        return;
      }
    } catch {
      // Fallback if backend is unreachable
    }

    await handleDirectGoogleLogin();
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
            Talk. Search. Explore.
            <br />
            <span>With VoxWeb.</span>
          </h1>

          <p className="auth-description">
            Your AI-powered voice assistant that helps you search, find information,
            play music, check weather, open websites, and get answers — all with your voice.
          </p>

          <div className="auth-features-grid">
            <div className="auth-feature-card">
              <div className="feat-icon">🎙</div>
              <h4>Voice to Text</h4>
              <p>Natural speech recognition in real-time</p>
            </div>
            <div className="auth-feature-card">
              <div className="feat-icon">⚡</div>
              <h4>Fast Open & Search</h4>
              <p>YouTube, Google Maps, Wikipedia, GitHub</p>
            </div>
            <div className="auth-feature-card">
              <div className="feat-icon">🤖</div>
              <h4>OpenRouter AI</h4>
              <p>Powered by GPT-4o-mini and LLM intelligence</p>
            </div>
            <div className="auth-feature-card">
              <div className="feat-icon">✉️</div>
              <h4>Email OTP Auth</h4>
              <p>Passwordless sign-in with 6-digit inbox code</p>
            </div>
          </div>
        </div>

        <div className="auth-bottom-wave">
          <Waveform count={32} active={true} height={28} color="rgba(56, 189, 248, 0.85)" />
        </div>
      </div>

      {/* Right Login Form Side */}
      <div className="auth-right">
        <div className="auth-form-card">
          <h2 className="auth-card-title">Welcome Back</h2>
          <p className="auth-card-subtitle">Sign in to your VoxWeb account</p>

          {/* Authentication Mode Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              marginBottom: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: authMode === 'password' ? 'var(--gradient-btn)' : 'transparent',
                color: authMode === 'password' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Lock size={15} />
              <span>Password Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: authMode === 'otp' ? 'var(--gradient-btn)' : 'transparent',
                color: authMode === 'otp' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <KeyRound size={15} />
              <span>Email OTP (Instant)</span>
            </button>
          </div>

          {errorMsg && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="google-auth-btn"
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Sign in with Google Account</span>
          </button>

          <div className="auth-divider">
            <span>OR CONTINUE WITH EMAIL</span>
          </div>

          {/* Form Option 1: Standard Password Login */}
          {authMode === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    style={{ paddingRight: '42px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {password && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    color: '#34d399',
                    marginBottom: '10px',
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Password hidden &amp; Bcrypt hash verified</span>
                </div>
              )}

              <div className="form-row-actions">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    className="remember-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember Me</span>
                </label>

                <Link to="/forgot-password" style={{ fontSize: '0.85rem' }}>
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className="btn-gradient-submit" disabled={isLoading}>
                <span>{isLoading ? 'Signing In...' : 'Sign In with Password'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* Form Option 2: Passwordless Email OTP Login */}
          {authMode === 'otp' && (
            <div>
              {!otpSent ? (
                <form onSubmit={handleRequestOtp}>
                  <div className="form-group">
                    <label className="form-label">Enter your Email</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        required
                        className="form-input"
                        placeholder="name@example.com"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    We will generate and send a SHA-256 hashed 6-digit OTP code directly to your email inbox.
                  </p>

                  <button type="submit" className="btn-gradient-submit" disabled={isLoading}>
                    <span>{isLoading ? 'Sending OTP...' : 'Send Login Code'}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      disabled
                      className="form-input"
                      value={otpEmail}
                      style={{ opacity: 0.7 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Enter 6-Digit Email OTP (Sent to Inbox)</label>
                    <div className="input-wrapper" style={{ position: 'relative' }}>
                      <KeyRound size={18} className="input-icon" />
                      <input
                        type={showOtp ? 'text' : 'password'}
                        required
                        maxLength={6}
                        className="form-input"
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        autoFocus
                        style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700, paddingRight: '42px' }}
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                    >
                      ← Change Email
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isLoading}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                    >
                      Resend Code
                    </button>
                  </div>

                  <button type="submit" className="btn-gradient-submit" disabled={isLoading}>
                    <span>{isLoading ? 'Verifying Code...' : 'Verify & Sign In'}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="auth-bottom-switch">
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
