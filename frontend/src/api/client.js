import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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
