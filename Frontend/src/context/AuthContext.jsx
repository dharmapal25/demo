import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from '../services/authService';
import { getAccessToken, clearAccessToken } from '../services/api';
import { initializeSocket, getSocket } from '../services/socketService';

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
        const token = getAccessToken();
        if (token) {
          try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
          } catch (err) {
            console.error('Failed to get current user:', err);
            clearAccessToken();
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
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
