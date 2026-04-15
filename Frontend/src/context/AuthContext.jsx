import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from '../services/authService';
import { getAccessToken, setAccessToken, clearAccessToken } from '../services/api';
import { initializeSocket, getSocket } from '../services/socketService';
import API from '../services/api';

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // On page reload, access token is lost from memory, so skip that check
        // Go directly to verify session from refresh token (cookies)

        // Use axios directly to avoid interceptor issues during initial auth check
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/verify-session`,
            {},
            { withCredentials: true, timeout: 5000 }
          );

          if (response.data && response.data.success && response.data.accessToken) {
            // Set the new access token in memory
            setAccessToken(response.data.accessToken);

            // setUser(response.data.user);
            setUser({                // --> new line
              ...response.data.user,
              _id: response.data.user._id || response.data.user.id,
            });
            console.log('✅ Session restored from refresh token');
            setLoading(false);
            return;
          }
        } catch (err) {
          // If verify-session fails, check if it's because backend is down or no session
          if (err.response?.status === 401) {
            console.debug('No valid session - user not authenticated');
          } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network')) {
            console.debug('Backend not available');
          } else {
            console.debug('Session verification error:', err.message);
          }
        }

        // If we reach here, user is not authenticated
        clearAccessToken();
      } catch (err) {
        console.error('Auth check error:', err);
        clearAccessToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Register handler
  const register = useCallback(async (username, email, password, passwordConfirm) => {
    try {
      setError(null);
      const response = await registerUser({
        username,
        email,
        password,
        passwordConfirm,
      });

      // Initialize Socket.IO and register user after successful registration
      setTimeout(() => {
        const socket = initializeSocket();
        if (socket && response.user) {
          socket.emit('register-user', { userId: response.user.id || response.user._id });
        }
      }, 500);

      setUser(response.user);
      return response;
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      throw err;
    }
  }, []);

  // Login handler
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const response = await loginUser({ email, password });
      setUser(response.user);

      // Initialize Socket.IO and register user
      setTimeout(() => {
        const socket = initializeSocket();
        socket.emit('register-user', { userId: response.user._id });
      }, 500);

      return response;
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      throw err;
    }
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      setError(null);
      await logoutUser();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
    }
  }, []);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!getAccessToken();

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use Auth Context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
