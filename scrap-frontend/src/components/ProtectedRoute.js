
/* src/components/routes/ProtectedRoute.js */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si el usuario tiene un rol permitido
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta página.</p>
        <p>Tu rol: <strong>{user.role}</strong></p>
        <p>Roles permitidos: <strong>{allowedRoles.join(', ')}</strong></p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;