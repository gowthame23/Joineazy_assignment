import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('joineazy_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('joineazy_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await api.get('/api/auth/me');
          setUser(res.user);
          localStorage.setItem('joineazy_user', JSON.stringify(res.user));
        } catch (err) {
          console.error('Session verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = (newToken, newUser) => {
    localStorage.setItem('joineazy_token', newToken);
    localStorage.setItem('joineazy_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const register = (newToken, newUser) => {
    login(newToken, newUser);
  };

  const logout = () => {
    localStorage.removeItem('joineazy_token');
    localStorage.removeItem('joineazy_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
