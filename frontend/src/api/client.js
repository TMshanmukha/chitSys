import axios from 'axios';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0');

// If testing locally in browser, always use local proxy (/api) to talk to local backend.
// In cloud production (Vercel), use configured VITE_API_BASE_URL or Back4App endpoint.
const apiBaseUrl = isLocal
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'https://chitsys-pugafvj4.back4.app/api');

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token if stored (enables bulletproof cross-origin auth)
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('chit_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignore storage errors in restrictive environments
  }
  return config;
});

// Response interceptor with automatic retry for transient network hiccups or proxy cold-starts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Do not retry if already retried 2 times or explicitly disabled
    if (!config || config._retryCount >= 2 || config._skipRetry) {
      return Promise.reject(error);
    }

    // Identify transient errors: network drops, timeouts, 502/503/504, or blank 500 proxy reset
    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message?.toLowerCase().includes('network error');

    const isTransientServerStatus =
      error.response &&
      (error.response.status === 502 ||
        error.response.status === 503 ||
        error.response.status === 504 ||
        (error.response.status === 500 && !error.response.data?.message));

    if (isNetworkError || isTransientServerStatus) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delayMs = config._retryCount * 200;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
