import API, { setAccessToken, getAccessToken, clearAccessToken } from './api';

// Register user
export const registerUser = async (userData) => {
  try {
    const response = await API.post('/auth/register', userData);
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await API.post('/auth/login', credentials);
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed';
    throw new Error(message);
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await API.get('/auth/me');
    return response.data.user;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch user';
    throw new Error(message);
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await API.post('/auth/logout');
    clearAccessToken();
  } catch (error) {
    clearAccessToken();
    throw error.response?.data || { message: 'Logout failed' };
  }
};

// Refresh access token
export const refreshAccessToken = async () => {
  try {
    const response = await API.post('/auth/refresh');
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    clearAccessToken();
    throw error.response?.data || { message: 'Token refresh failed' };
  }
};

export default API;
