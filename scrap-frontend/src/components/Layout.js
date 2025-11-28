/* src/components/Layout.js */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, spacing, typography, baseComponents } from '../styles/designSystem';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.background,
      fontFamily: typography.fontFamily
    },
    header: {
      backgroundColor: colors.surface,
      padding: `${spacing.md} ${spacing.lg}`,
      boxShadow: shadows.md,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${colors.gray200}`
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md
    },
    logo: {
      height: '40px',
      width: 'auto',
      filter: 'brightness(0) invert(0)'
    },
    title: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.gray900,
      margin: 0,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      color: colors.gray700
    },
    logoutButton: {
      ...baseComponents.buttonSecondary,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.sizes.sm
    },
    main: {
      padding: spacing.lg,
      minHeight: 'calc(100vh - 80px)'
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img 
            src="/Logo-COFICAB.png" 
            alt="COFICAB Logo" 
            style={styles.logo}
          />
          <h1 style={styles.title}>Sistema de Control de Scrap</h1>
        </div>
        <div style={styles.userInfo}>
          <span style={{ fontWeight: typography.weights.medium }}>
            {user.name} <span style={{ color: colors.gray500 }}>({user.role})</span>
          </span>
          <button onClick={logout} style={styles.logoutButton}>
            Cerrar Sesión
          </button>
        </div>
      </header>
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
};

export default Layout;