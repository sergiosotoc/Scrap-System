// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const userData = await apiClient.getUser();
        setUser(userData.user);
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('authToken');
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      console.log('AuthContext - Iniciando login para:', username);
      const response = await apiClient.login(username, password);

      console.log('AuthContext - Login exitoso', response);
      
      localStorage.setItem('authToken', response.token);
      setUser(response.user);
      
      return { success: true, user: response.user };

    } catch (error) {
      console.log('AuthContext - Error en login:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};