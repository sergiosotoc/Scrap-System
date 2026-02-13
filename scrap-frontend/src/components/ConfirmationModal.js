/* src/components/ConfirmationModal.js */
import React from 'react';
import { createPortal } from 'react-dom';
import CardTransition from './CardTransition';
import SmoothButton from './SmoothButton';
import { colors, spacing, radius, shadows, typography } from '../styles/designSystem';

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar" }) => {
  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      animation: 'fadeIn 0.2s ease-out'
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      boxShadow: shadows.xl,
      width: '90%',
      maxWidth: '450px',
      padding: spacing.xl,
      border: `1px solid ${colors.gray200}`,
      textAlign: 'center'
    },
    iconContainer: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: colors.warning + '15',
      color: colors.warning,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto ' + spacing.lg
    },
    title: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.gray900,
      marginBottom: spacing.sm,
      margin: 0
    },
    message: {
      fontSize: typography.sizes.base,
      color: colors.gray600,
      lineHeight: 1.6,
      marginBottom: spacing.xl
    },
    actions: {
      display: 'flex',
      gap: spacing.md,
      justifyContent: 'center'
    }
  };

  return createPortal(
    <div style={styles.overlay} onClick={onCancel}>
      <CardTransition 
        delay={0} 
        style={styles.modal} 
        onClick={e => e.stopPropagation()}
      >
        <div style={styles.iconContainer}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <SmoothButton variant="secondary" onClick={onCancel} style={{ flex: 1 }}>
            {cancelText}
          </SmoothButton>
          <SmoothButton variant="destructive" onClick={onConfirm} style={{ flex: 1 }}>
            {confirmText}
          </SmoothButton>
        </div>
      </CardTransition>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
};

export default ConfirmationModal;