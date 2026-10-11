import axios from 'axios';

// Dynamically determine the backend API base URL
export const getBaseURL = () => {
  // If explicitly specified in .env (e.g. VITE_API_URL=http://127.0.0.1:8000/api)
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In dev (Vite proxy) and production SPA, relative /api routes safely without CORS or IPv6 localhost issues
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token if present
api.interceptors.request.use(
  (config) => {
    if (!config.baseURL) {
      config.baseURL = getBaseURL();
    }

    const token = localStorage.getItem('voxweb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      const currentToken = localStorage.getItem('voxweb_token');
      if (currentToken !== 'demo-token' && !currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('voxweb_token');
        localStorage.removeItem('voxweb_user');
      }
    }
    return Promise.reject(error);
  }
);

export const parseApiError = (err, fallback) => {
  if (!err) return fallback || 'An unknown error occurred.';
  if (!err.response) {
    return 'Network Error: Cannot connect to VoxWeb backend. Please ensure the backend server is running on port 8000.';
  }
  const detail = err.response.data?.detail;
  if (detail) {
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg).join(', ');
    }
    return detail;
  }
  return fallback || 'An unexpected error occurred.';
};

export default api;
