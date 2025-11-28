/* src/context/ToastContext.js */
import React, { createContext, useState, useContext, useCallback } from 'react';
import { colors, shadows, radius, spacing, typography } from '../styles/designSystem';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Estilos modernizados para toasts
  const toastStyles = {
    container: {
      position: 'fixed',
      top: '80px',
      right: spacing.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sm,
      zIndex: 9999,
      pointerEvents: 'none',
    },
    toast: {
      minWidth: '320px',
      maxWidth: '400px',
      padding: spacing.md,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.sm,
      color: colors.surface,
      fontSize: typography.sizes.sm,
      lineHeight: 1.5,
      pointerEvents: 'auto',
      animation: 'slideInRight 0.3s ease',
      border: '1px solid rgba(255,255,255,0.1)',
      transform: 'translateX(0)',
      opacity: 1,
      transition: 'all 0.3s ease'
    },
    success: { 
      backgroundColor: colors.success,
      borderLeft: `4px solid ${colors.secondaryHover}`
    },
    error: { 
      backgroundColor: colors.error,
      borderLeft: `4px solid #DC2626`
    },
    warning: { 
      backgroundColor: colors.warning,
      borderLeft: `4px solid #D97706`
    },
    info: { 
      backgroundColor: colors.info,
      borderLeft: `4px solid #2563EB`
    },
    icon: { 
      fontSize: '1.2rem',
      flexShrink: 0,
      marginTop: '2px'
    },
    message: { 
      margin: 0, 
      flex: 1, 
      fontWeight: typography.weights.medium 
    },
    closeBtn: {
      background: 'transparent',
      border: 'none',
      color: 'rgba(255,255,255,0.8)',
      fontSize: '1.5rem',
      cursor: 'pointer',
      padding: '0',
      lineHeight: '1',
      marginTop: '-2px',
      flexShrink: 0,
      borderRadius: radius.sm,
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(255,255,255,0.1)'
      }
    }
  };

  // Agregar estilos de animación al documento
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .toast-exit {
        animation: slideOutRight 0.3s ease forwards;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Contenedor de Notificaciones */}
      <div style={toastStyles.container}>
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            style={{
              ...toastStyles.toast,
              ...toastStyles[toast.type]
            }}
          >
            <span style={toastStyles.icon}>
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <p style={toastStyles.message}>{toast.message}</p>
            <button 
              onClick={() => removeToast(toast.id)} 
              style={toastStyles.closeBtn}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;