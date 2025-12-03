/* src/components/ProtectedRoute.js */
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius, baseComponents } from '../styles/designSystem';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

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
    return null; 
  }

  if (requiredRole && user.role !== requiredRole) {
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
          <p style={styles.errorMessage}>No tiene los permisos necesarios para acceder a esta página</p>
          <div style={styles.buttonGroup}>
            <button 
              onClick={() => window.history.back()}
              style={styles.secondaryButton}
            >
              Volver Atrás
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
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
  // Estilos de error
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: spacing.xl
  },
  errorContent: {
    ...baseComponents.card,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.lg,
    textAlign: 'center',
    padding: spacing.xl,
    maxWidth: '450px',
    width: '100%'
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
    lineHeight: 1.5
  },
  loginButton: {
    ...baseComponents.buttonPrimary,
    width: 'auto',
    minWidth: '140px'
  },
  secondaryButton: {
    ...baseComponents.buttonSecondary,
    width: 'auto',
    minWidth: '140px'
  },
  buttonGroup: {
    display: 'flex',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap'
  }
};

if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
    try {
        const rules = Array.from(styleSheet.cssRules).map(r => r.cssText).join('');
        if (!rules.includes('@keyframes spin')) {
        styleSheet.insertRule(`
            @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);
        }
    } catch (e) {}
  }
}

export default ProtectedRoute;