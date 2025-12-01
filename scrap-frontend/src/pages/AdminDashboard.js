/* src/pages/AdminDashboard.js - VERSIÓN CON SPINNER */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import UserManagement from '../components/UserManagement';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Agregar animación de spinner
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const loadData = async () => {
    try {
      const data = await apiClient.getDashboardStats();
      setStats(data);
    } catch (error) {
      addToast('Error cargando dashboard: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ESTILOS CON SPINNER INCLUIDO
  // ==========================================
  const styles = {
    container: {
      padding: spacing.lg,
      backgroundColor: colors.background,
      minHeight: '100vh',
      fontFamily: typography.fontFamily
    },
    header: {
      marginBottom: spacing.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md
    },
    title: {
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.extrabold,
      color: colors.gray900,
      margin: 0,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: colors.background,
      flexDirection: 'column',
      gap: spacing.md
    },
    spinner: {
      width: '60px',
      height: '60px',
      border: `3px solid ${colors.primaryLight}`,
      borderTop: `3px solid ${colors.primary}`,
      borderRight: `3px solid ${colors.secondary}`,
      borderBottom: `3px solid ${colors.secondary}`,
      borderRadius: '50%',
      animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
    },
    loadingText: {
      fontSize: typography.sizes.lg,
      color: colors.gray600,
      fontWeight: typography.weights.medium
    },
    tabs: {
      display: 'flex',
      gap: spacing.xs,
      borderBottom: `2px solid ${colors.gray200}`,
      paddingBottom: '2px'
    },
    tab: {
      padding: `${spacing.sm} ${spacing.md}`,
      background: 'none',
      border: 'none',
      borderTop: 'none',
      borderRight: 'none',
      borderLeft: 'none',
      borderBottom: '1px solid transparent',
      color: colors.gray600,
      cursor: 'pointer',
      borderRadius: `${radius.md} ${radius.md} 0 0`,
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.medium,
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: colors.gray100,
        color: colors.gray700,
        borderBottomColor: colors.gray300
      }
    },
    tabActive: {
      padding: `${spacing.sm} ${spacing.md}`,
      background: 'none',
      border: 'none',
      borderTop: 'none',
      borderRight: 'none',
      borderLeft: 'none',
      borderBottom: `2px solid ${colors.primary}`,
      color: colors.primary,
      cursor: 'pointer',
      borderRadius: `${radius.md} ${radius.md} 0 0`,
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.semibold,
      marginBottom: '-2px'
    },
    gridStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: spacing.lg,
      marginBottom: spacing.lg
    },
    statCard: {
      ...baseComponents.card,
      padding: spacing.lg,
      textAlign: 'center',
      transition: 'all 0.3s ease',
      borderLeft: `4px solid ${colors.primary}`,
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: shadows.lg
      }
    },
    statLabel: {
      fontSize: typography.sizes.sm,
      color: colors.gray600,
      fontWeight: typography.weights.semibold,
      display: 'block',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: spacing.xs
    },
    statNumber: {
      fontSize: '2.5rem',
      fontWeight: typography.weights.extrabold,
      color: colors.gray900,
      display: 'block',
      lineHeight: '1'
    },
    card: {
      ...baseComponents.card,
      minHeight: '400px'
    },
    cardHeader: {
      padding: spacing.lg,
      borderBottom: `1px solid ${colors.gray200}`,
      backgroundColor: colors.gray50
    },
    cardTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.semibold,
      color: colors.gray800,
      margin: 0
    },
    emptyState: {
      padding: spacing.xl,
      textAlign: 'center',
      color: colors.gray500,
      fontSize: typography.sizes.lg
    }
  };

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <div style={styles.loadingText}>Cargando panel de administración...</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Panel de Control Administrativo</h1>
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('overview')}
            style={activeTab === 'overview' ? styles.tabActive : styles.tab}
          >
            Resumen General
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={activeTab === 'users' ? styles.tabActive : styles.tab}
          >
            Gestión de Usuarios
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={styles.gridStats}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Usuarios Totales</span>
              <span style={styles.statNumber}>{stats?.total_usuarios || 0}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Registros Scrap</span>
              <span style={styles.statNumber}>{stats?.total_registros || 0}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Peso Procesado</span>
              <span style={styles.statNumber}>
                {stats?.total_peso_kg || 0}
                <small style={{ fontSize: typography.sizes.lg, color: colors.gray500 }}> kg</small>
              </span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Recepciones</span>
              <span style={styles.statNumber}>{stats?.total_recepciones || 0}</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Actividad Reciente del Sistema</h3>
            </div>
            <div style={{ padding: spacing.xl, color: colors.gray500, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: spacing.md }}>📊</div>
              <p>Módulo de gráficas y estadísticas en desarrollo</p>
              <p style={{ fontSize: typography.sizes.sm, marginTop: spacing.xs }}>
                Próximamente: Gráficas de tendencias y reportes detallados
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Gestión de Usuarios del Sistema</h3>
          </div>
          <div style={{ padding: spacing.lg }}>
            <UserManagement />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;