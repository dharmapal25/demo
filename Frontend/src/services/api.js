import axios from 'axios';

// Create axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://chatroom-hub-server.onrender.com/api',
  withCredentials: true, // Enable cookies
});

// Access token stored in memory (not localStorage)
let accessToken = null;

// Request interceptor - add access token to headers
API.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If access token expired (401) and not already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/login' &&
      originalRequest.url !== '/auth/register' &&
      originalRequest.url !== '/auth/verify-session'
    ) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'https://chatroom-hub-server.onrender.com/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Update access token (memory only)
        accessToken = data.accessToken;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        accessToken = null;
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Export function to set access token (called after login)
// Access token is stored in memory only, not in localStorage
export const setAccessToken = (token) => {
  accessToken = token;
};

// Export function to get access token
export const getAccessToken = () => {
  return accessToken;
};

// Export function to clear access token (called on logout)
// Access token is cleared from memory
export const clearAccessToken = () => {
  accessToken = null;
};

export default API;