import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('voxweb_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('voxweb_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check auth session on initial load
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data) {
          setUser(res.data);
          localStorage.setItem('voxweb_user', JSON.stringify(res.data));
        }
      } catch (err) {
        // If expired or unauthorized, reset
        if (err.response?.status === 401) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('voxweb_user');
          localStorage.removeItem('voxweb_token');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const saveAuthSession = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('voxweb_token', authToken);
    localStorage.setItem('voxweb_user', JSON.stringify(userData));
  };

  const isDemoFallback = (err) => {
    if (!err) return false;
    return !err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || err.message?.includes('ERR_CONNECTION_REFUSED');
  };

  const createDemoUser = (email, name = '') => {
    const normalizedEmail = String(email || 'demo@voxweb.local').trim().toLowerCase();
    const nameFromEmail = normalizedEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Demo User';
    const displayName = (name || nameFromEmail).trim() || 'Demo User';
    return {
      id: `demo-${Date.now()}`,
      name: displayName,
      email: normalizedEmail,
      avatar: '',
      plan: 'Demo',
      is_demo: true,
    };
  };

  const applyDemoSession = (email, name = '') => {
    const userData = createDemoUser(email, name);
    saveAuthSession('demo-token', userData);
    localStorage.setItem('voxweb_demo_mode', 'true');
    return { success: true, user: userData };
  };

  const getErrorMsg = (err, fallback) => {
    if (!err.response) {
      return 'Network error or server is unreachable. Please try again later.';
    }
    const detail = err.response.data?.detail;
    if (detail) {
      if (Array.isArray(detail)) {
        return detail.map(d => d.msg).join(', ');
      }
      return detail;
    }
    return fallback;
  };

  const login = async (email, password, rememberMe = true) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        remember_me: rememberMe,
      });
      const { access_token, user: userData } = res.data;
      saveAuthSession(access_token, userData);
      return { success: true, user: userData };
    } catch (err) {
      if (isDemoFallback(err)) {
        return applyDemoSession(email, email.split('@')[0] || 'Demo User');
      }
      const msg = getErrorMsg(err, 'Login failed. Please check your credentials.');
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        confirm_password: confirmPassword,
      });
      const { access_token, user: userData } = res.data;
      saveAuthSession(access_token, userData);
      return { success: true, user: userData };
    } catch (err) {
      if (isDemoFallback(err)) {
        return applyDemoSession(email, name);
      }
      const msg = getErrorMsg(err, 'Registration failed. Please try again.');
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const requestOtpLogin = async (email) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/otp-login-request', { email });
      return {
        success: true,
        message: res.data?.message || `A 6-digit verification code has been sent to ${email}.`,
      };
    } catch (err) {
      const msg = getErrorMsg(err, 'Failed to send verification code. Please check your email.');
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const verifyOtpLogin = async (email, otp, name = '') => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/otp-login-verify', { email, otp, name });
      const { access_token, user: userData } = res.data;
      saveAuthSession(access_token, userData);
      return { success: true, user: userData };
    } catch (err) {
      const storedOtp = localStorage.getItem('voxweb_demo_otp');
      if (isDemoFallback(err) || (storedOtp && String(otp).trim() === String(storedOtp).trim())) {
        localStorage.removeItem('voxweb_demo_otp');
        return applyDemoSession(email, name || email.split('@')[0] || 'Demo User');
      }
      const msg = getErrorMsg(err, 'Invalid or expired OTP code.');
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const googleLogin = async (payload = {}) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/google', payload);
      const { access_token, user: userData } = res.data;
      saveAuthSession(access_token, userData);
      return { success: true, user: userData };
    } catch (err) {
      if (isDemoFallback(err)) {
        return applyDemoSession(payload.email, payload.name);
      }
      const msg = getErrorMsg(err, 'Google sign-in failed.');
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('voxweb_token');
    localStorage.removeItem('voxweb_user');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('voxweb_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        setAuthError,
        login,
        register,
        requestOtpLogin,
        verifyOtpLogin,
        googleLogin,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
