/* src/components/ProtectedRoute.js - VERSIÓN CORREGIDA */
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, baseComponents } from '../styles/designSystem';
import LoadingSpinner from './LoadingSpinner';
import SmoothButton from './SmoothButton';
import { Navigate, useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, logout } = useAuth();

  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    if (user?.role) {
      navigate(`/${user.role}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleLogoutAndGoToLogin = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner
          size="lg"
          message={
            <div style={styles.loadingTextContainer}>
              <p style={styles.loadingMessage}>Verificando autenticación</p>
              <p style={styles.loadingSubmessage}>Espere un momento por favor...</p>
            </div>
          }
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const hasPermission = Array.isArray(requiredRole)
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;

    if (!hasPermission) {
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorContent}>
            <div style={styles.errorIconCircle}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 style={styles.errorTitle}>Permisos insuficientes</h2>
            <p style={styles.errorMessage}>
              No tiene permisos para acceder a esta página.
              <br />
              <strong>Su rol actual: {user.role.toUpperCase()}</strong>
              <br />
              <span style={{ fontSize: '0.9em', color: colors.gray500 }}>
                Rol requerido: {Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole.toUpperCase()}
              </span>
            </p>

            <div style={styles.buttonGroup}>
              <SmoothButton
                onClick={() => window.history.back()}
                variant="secondary"
                style={styles.secondaryButton}
              >
                Volver Atrás
              </SmoothButton>

              <SmoothButton
                onClick={handleGoToDashboard}
                style={styles.dashboardButton}
              >
                Ir a mi Dashboard
              </SmoothButton>

              <SmoothButton
                onClick={handleLogoutAndGoToLogin}
                variant="destructive"
                style={styles.logoutButton}
              >
                Cerrar Sesión
              </SmoothButton>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
};

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: spacing.xl
  },
  loadingTextContainer: {
    textAlign: 'center',
    marginTop: spacing.xs
  },
  loadingMessage: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.gray800,
    margin: 0
  },
  loadingSubmessage: {
    fontSize: typography.sizes.base,
    color: colors.gray600,
    margin: 0,
    opacity: 0.8
  },

  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: spacing.xl,
    width: '100%',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999
  },

  errorContent: {
    ...baseComponents.card,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.lg,
    textAlign: 'center',
    padding: spacing.xl,
    maxWidth: '500px',
    width: '100%',
    margin: 'auto'
  },

  errorIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: colors.error + '15',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },

  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.error,
    margin: 0
  },

  errorMessage: {
    fontSize: typography.sizes.base,
    color: colors.gray600,
    margin: 0,
    lineHeight: 1.6
  },

  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },

  secondaryButton: {
    width: '100%',
    maxWidth: '250px'
  },

  dashboardButton: {
    width: '100%',
    maxWidth: '250px',
    backgroundColor: colors.primary,
    color: '#fff'
  },

  logoutButton: {
    width: '100%',
    maxWidth: '250px',
    backgroundColor: colors.error,
    color: '#fff'
  }
};

export default ProtectedRoute;