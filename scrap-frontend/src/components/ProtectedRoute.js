/* src/components/ProtectedRoute.js */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius } from '../styles/designSystem';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <div style={styles.loadingText}>
            <p style={styles.loadingMessage}>Verificando autenticación</p>
            <p style={styles.loadingSubmessage}>Espere un momento por favor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorContent}>
          <div style={styles.errorIcon}>🔒</div>
          <h2 style={styles.errorTitle}>Acceso no autorizado</h2>
          <p style={styles.errorMessage}>Debe iniciar sesión para acceder a esta página</p>
          <button 
            onClick={handleLoginRedirect}
            style={styles.loginButton}
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorContent}>
          <div style={styles.errorIcon}>🚫</div>
          <h2 style={styles.errorTitle}>Permisos insuficientes</h2>
          <p style={styles.errorMessage}>No tiene los permisos necesarios para acceder a esta página</p>
          <div style={styles.buttonGroup}>
            <button 
              onClick={() => window.history.back()}
              style={styles.secondaryButton}
            >
              Volver Atrás
            </button>
            <button 
              onClick={handleLoginRedirect}
              style={styles.loginButton}
            >
              Ir al Login
            </button>
          </div>
        </div>
      </div>
    );
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
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.lg,
    textAlign: 'center',
    maxWidth: '400px'
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: `4px solid ${colors.gray200}`,
    borderTop: `4px solid ${colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
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
    padding: spacing.xl
  },
  errorContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.lg,
    textAlign: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${colors.gray200}`,
    maxWidth: '450px',
    width: '100%'
  },
  errorIcon: {
    fontSize: '48px',
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
    lineHeight: 1.5
  },
  loginButton: {
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: 'auto',
    minWidth: '140px',
    ':hover': {
      backgroundColor: colors.primaryDark,
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
    },
    ':active': {
      transform: 'translateY(0)'
    }
  },
  secondaryButton: {
    backgroundColor: colors.gray200,
    color: colors.gray700,
    border: 'none',
    borderRadius: radius.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: 'auto',
    minWidth: '140px',
    ':hover': {
      backgroundColor: colors.gray300,
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
    },
    ':active': {
      transform: 'translateY(0)'
    }
  },
  buttonGroup: {
    display: 'flex',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap'
  }
};

// Agregar la animación del spinner si no existe
if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
    const existingRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText);
    if (!existingRules.some(rule => rule.includes('@keyframes spin'))) {
      styleSheet.insertRule(`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `, styleSheet.cssRules.length);
    }
  }
}

export default ProtectedRoute;