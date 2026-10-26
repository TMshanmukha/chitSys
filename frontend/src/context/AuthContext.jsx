import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check existing session via HttpOnly cookie
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setAuthError(null);
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      // Not logged in or expired session is normal on initial load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login action
  const login = async ({ role, username, password }) => {
    try {
      setAuthError(null);
      const res = await api.post('/auth/login', { role, username, password });
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      throw new Error(res.data?.message || 'Authentication failed.');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      setAuthError(message);
      throw new Error(message);
    }
  };

  // Logout action
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  const value = {
    user,
    loading,
    authError,
    setAuthError,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    isAgent: user?.role === 'COLLECTION_AGENT',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
