import React, { createContext, useState, useContext, useCallback } from 'react';

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

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Contenedor de Notificaciones */}
      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-enter" style={{...styles.toast, ...styles[toast.type]}}>
            <span style={styles.icon}>
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <p style={styles.message}>{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} style={styles.closeBtn}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const styles = {
  toastContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 9999,
  },
  toast: {
    minWidth: '300px',
    maxWidth: '400px',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    color: '#fff',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  success: { backgroundColor: '#10B981' }, // Verde moderno
  error:   { backgroundColor: '#EF4444' }, // Rojo moderno
  warning: { backgroundColor: '#F59E0B' }, // Naranja
  info:    { backgroundColor: '#3B82F6' }, // Azul
  icon: { fontSize: '1.2rem' },
  message: { margin: 0, flex: 1, fontWeight: '500' },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0',
    lineHeight: '1',
    marginTop: '-4px'
  }
};