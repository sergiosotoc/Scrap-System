/* src/components/Layout.js */
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, baseComponents, radius, shadows } from '../styles/designSystem';
import SmoothButton from './SmoothButton';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesión en contexto:", error);
    } finally {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
    }
  }, [user]);

  if (!user) return null;

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.background,
      fontFamily: typography.fontFamily,
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      padding: `0 ${spacing.xl}`,
      boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      justifyContent: 'space-between', // Mantiene logo a la izq y usuario a la der
      alignItems: 'center',
      borderBottom: `1px solid ${colors.gray200}`,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '72px',
      width: '100%',
      boxSizing: 'border-box',
      transition: 'all 0.3s ease'
    },
    // Logo a la izquierda
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      zIndex: 2 // Asegurar que esté por encima si la pantalla es muy chica
    },
    logo: {
      height: '48px',
      width: 'auto',
      display: 'block'
    },
    // Contenedor para Centrar el Título Absolutamente
    titleContainer: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'auto',
      zIndex: 1
    },
    title: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.extrabold,
      color: colors.gray900,
      margin: 0,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-0.02em',
      whiteSpace: 'nowrap',
      textAlign: 'center'
    },
    // Usuario a la derecha
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.lg,
      height: '100%',
      zIndex: 2
    },
    userDetails: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: '2px',
      marginRight: spacing.sm
    },
    userName: {
      fontWeight: '700',
      color: colors.gray800,
      fontSize: '0.9rem',
      lineHeight: 1.2
    },
    userRoleBadge: {
      fontSize: '10px',
      color: colors.primary,
      backgroundColor: colors.primaryLight + '50',
      padding: '2px 8px',
      borderRadius: radius.full,
      textTransform: 'uppercase',
      fontWeight: '800',
      letterSpacing: '0.05em',
      lineHeight: 1,
      border: `1px solid ${colors.primaryLight}`
    },
    separator: {
      width: '1px',
      height: '32px',
      backgroundColor: colors.gray200,
      margin: `0 ${spacing.xs}`
    },
    main: {
      padding: spacing.lg,
      flex: 1,
      width: '100%',
      boxSizing: 'border-box',
      maxWidth: '1600px',
      margin: '0 auto'
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        {/* Izquierda: Logo */}
        <div style={styles.headerLeft}>
          <img 
            src="/Logo-COFICAB.png" 
            alt="COFICAB" 
            style={styles.logo}
          />
        </div>
        
        {/* Centro: Título Absoluto */}
        <div style={styles.titleContainer}>
          <h1 style={styles.title}>Control de Scrap</h1>
        </div>
        
        {/* Derecha: Información de Usuario */}
        <div style={styles.userInfo}>
          <div style={styles.userDetails}>
            <span style={styles.userName}>
              {user.name || 'Usuario'}
            </span>
            <span style={styles.userRoleBadge}>
              {user.role || 'Invitado'}
            </span>
          </div>

          <div style={styles.separator}></div>

          <SmoothButton 
            onClick={handleLogout} 
            variant="secondary" 
            title="Cerrar sesión"
            style={{
              padding: `0 ${spacing.md}`,
              height: '36px',
              fontSize: typography.sizes.sm,
              gap: '8px',
              border: `1px solid ${colors.gray300}`,
              backgroundColor: 'transparent',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Salir</span>
          </SmoothButton>
        </div>
      </header>
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
};

export default Layout;