import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import UserManagement from '../components/UserManagement'; // Asumiendo que también refactorizas este o lo dejas como está

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await apiClient.getDashboardStats(); // Asumiendo que tu API devuelve todo o usas Promise.all
      setStats(data);
    } catch (error) {
      addToast('Error cargando dashboard: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Cargando admin...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Panel de Control</h1>
        <div style={styles.tabs}>
          <button onClick={() => setActiveTab('overview')} style={activeTab === 'overview' ? styles.tabActive : styles.tab}>Resumen</button>
          <button onClick={() => setActiveTab('users')} style={activeTab === 'users' ? styles.tabActive : styles.tab}>Usuarios</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={styles.gridStats}>
            {/* Ejemplo de tarjetas estáticas si la API no devuelve todo, ajustar según tu respuesta de API real */}
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
              <span style={styles.statNumber}>{stats?.total_peso_kg || 0} kg</span>
            </div>
          </div>

          {/* Aquí puedes agregar más secciones de gráficas o tablas resumen usando los mismos estilos */}
          <div style={styles.card}>
            <div style={styles.cardHeader}><h3>Actividad Reciente</h3></div>
            <div style={{ padding: '2rem', color: '#6B7280', textAlign: 'center' }}>
              Funcionalidad de gráficas o logs aquí...
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div style={styles.card}>
          <UserManagement />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    backgroundColor: '#F3F4F6',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#111827',
    margin: 0
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    borderBottom: '1px solid #E5E7EB'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    background: 'none',
    border: 'none',
    color: '#6B7280',
    cursor: 'pointer',
    borderBottom: '2px solid transparent'
  },
  tabActive: {
    padding: '0.75rem 1.5rem',
    background: 'none',
    border: 'none',
    color: '#2563EB',
    cursor: 'pointer',
    borderBottom: '2px solid #2563EB',
    fontWeight: '600'
  },
  gridStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#111827',
    marginTop: '0.5rem',
    display: 'block'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    minHeight: '400px'
  },
  cardHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB'
  },
};

export default AdminDashboard;