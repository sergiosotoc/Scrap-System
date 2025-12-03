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

  // Iconos SVG para los toasts
  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    )
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
      gap: spacing.md,
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
      flexShrink: 0,
      marginTop: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
      fontSize: '1.2rem',
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
              {icons[toast.type]}
            </span>
            <p style={toastStyles.message}>{toast.message}</p>
            <button 
              onClick={() => removeToast(toast.id)} 
              style={toastStyles.closeBtn}
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;