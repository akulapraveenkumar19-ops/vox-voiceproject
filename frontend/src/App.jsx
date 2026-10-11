import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Smartphone, Monitor, Wifi, BatteryCharging } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VoiceProvider, useVoice } from './context/VoiceContext';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import GoogleCallback from './pages/GoogleCallback';
import MobileBottomNav from './components/MobileBottomNav';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--accent-blue)',
          fontSize: '1.2rem',
          fontWeight: 600,
        }}
      >
        Initializing VoxWeb...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Guard (Redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AppRoutes = () => {
  const location = useLocation();
  const { mobileAppMode, setMobileAppMode } = useVoice();
  const params = new URLSearchParams(location.search);
  const isOAuthCallback =
    location.pathname === '/auth/google/callback' ||
    (location.pathname === '/' && (params.has('code') || params.has('state')));

  if (isOAuthCallback) {
    return <GoogleCallback />;
  }

  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const content = (
    <>
      <Routes>
        {/* Public Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        {/* Protected App Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Default Catch-all */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <MobileBottomNav />
    </>
  );

  if (mobileAppMode) {
    return (
      <div className="mobile-simulator-backdrop">
        <div className="mobile-simulator-toolbar">
          <div className="mobile-simulator-badge">
            <Smartphone size={16} color="#38bdf8" />
            <span>VoxWeb Mobile App Mode (Responsive View)</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileAppMode(false)}
            className="mobile-simulator-exit-btn"
          >
            <Monitor size={15} />
            <span>Switch to Full Desktop View</span>
          </button>
        </div>

        <div className="mobile-phone-device-frame">
          {/* Phone Status Bar & Dynamic Island Notch */}
          <div className="mobile-phone-status-bar">
            <span className="mobile-status-time">{timeString}</span>
            <div className="mobile-dynamic-island" />
            <div className="mobile-status-icons">
              <span>5G</span>
              <Wifi size={13} />
              <BatteryCharging size={15} color="#4ade80" />
            </div>
          </div>

          {/* Scrollable App Viewport */}
          <div className="mobile-phone-screen-viewport">{content}</div>

          {/* Home Indicator Pill */}
          <div className="mobile-phone-home-indicator">
            <div className="mobile-home-bar" />
          </div>
        </div>
      </div>
    );
  }

  return content;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <VoiceProvider>
          <AppRoutes />
        </VoiceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
