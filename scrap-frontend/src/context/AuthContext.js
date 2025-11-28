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

  // Función para analizar errores del servidor
  const parseAuthError = (error) => {
    console.log('🔍 Parseando error de autenticación:', error);

    // Si el error ya tiene un mensaje específico del backend, usarlo directamente
    if (error.message) {
      return error;
    }

    // Si es un error de red
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new Error('Error de conexión. Verifica tu internet o contacta al administrador');
    }

    // Si no se puede determinar el error, devolver genérico
    return new Error('Error desconocido al iniciar sesión');
  };

  const login = async (username, password) => {
    try {
      console.log('🔐 AuthContext - Iniciando login para:', username);

      // Validaciones básicas del lado del cliente
      if (!username.trim() || !password.trim()) {
        throw new Error('Usuario y contraseña son requeridos');
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      const response = await apiClient.login(username, password);
      console.log('✅ AuthContext - Login exitoso', response);

      if (!response.token) {
        throw new Error('No se recibió token de autenticación');
      }

      if (!response.user) {
        throw new Error('No se recibió información del usuario');
      }

      localStorage.setItem('authToken', response.token);
      setUser(response.user);

      return { success: true, user: response.user };

    } catch (error) {
      console.error('❌ AuthContext - Error en login:', error);

      // Parsear el error para dar un mensaje más específico
      const parsedError = parseAuthError(error);

      return {
        success: false,
        error: parsedError.message,
        originalError: error
      };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AuthContext - Cerrando sesión');
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