// src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import UserManagement from '../components/UserManagement';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, activityData, adminStatsData] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getRecentActivity(),
        apiClient.getAdminStats()
      ]);
      
      setStats(statsData);
      setRecentActivity(activityData);
      setAdminStats(adminStatsData);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAreaLabel = (area) => {
    const areas = {
      'TREFILADO': 'Trefilado',
      'BUNCHER': 'Buncher',
      'EXTRUSION': 'Extrusión',
      'XLPE': 'XLPE',
      'EBEAM': 'E-Beam',
      'RWD': 'Rewind',
      'OTHERS': 'Otros'
    };
    return areas[area] || area;
  };

  if (loading) {
    return <div style={styles.loading}>📊 Cargando dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1>👑 Dashboard - Administrador</h1>
          <p>Bienvenido, {user.name}</p>
        </div>
        <div style={styles.tabs}>
          <button 
            style={{...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('overview')}
          >
            📊 Resumen
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'users' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('users')}
          >
            👥 Usuarios
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'reports' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('reports')}
          >
            📈 Reportes
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Estadísticas Generales */}
          <section style={styles.statsSection}>
            <h2>📈 Estadísticas Generales del Sistema</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <h3>👥 Total Usuarios</h3>
                <p style={styles.statNumber}>{stats?.total_usuarios || 0}</p>
                <p style={styles.statSubtitle}>
                  {stats?.usuarios_por_rol?.find(u => u.role === 'admin')?.count || 0} Admin · 
                  {stats?.usuarios_por_rol?.find(u => u.role === 'operador')?.count || 0} Operadores · 
                  {stats?.usuarios_por_rol?.find(u => u.role === 'receptor')?.count || 0} Receptores
                </p>
              </div>
              <div style={styles.statCard}>
                <h3>📋 Registros de Scrap</h3>
                <p style={styles.statNumber}>{stats?.total_registros || 0}</p>
                <p style={styles.statSubtitle}>
                  {stats?.scrap_pendiente || 0} Pendientes · 
                  {stats?.scrap_recibido || 0} Recibidos
                </p>
              </div>
              <div style={styles.statCard}>
                <h3>🏷️ Recepciones</h3>
                <p style={styles.statNumber}>{stats?.total_recepciones || 0}</p>
                <p style={styles.statSubtitle}>
                  {stats?.total_peso_recepciones || 0} kg total
                </p>
              </div>
              <div style={styles.statCard}>
                <h3>⚖️ Peso Total</h3>
                <p style={styles.statNumber}>{stats?.total_peso_registros || 0} kg</p>
                <p style={styles.statSubtitle}>
                  Registrado en el sistema
                </p>
              </div>
            </div>
          </section>

          {/* Distribución por Área */}
          <section style={styles.distributionSection}>
            <h2>🏭 Distribución de Scrap por Área</h2>
            <div style={styles.distributionGrid}>
              {stats?.scrap_por_area?.map((area, index) => (
                <div key={index} style={styles.areaCard}>
                  <h4>{getAreaLabel(area.area_real)}</h4>
                  <p style={styles.areaPeso}>{area.total_kg} kg</p>
                  <div style={styles.progressBar}>
                    <div 
                      style={{
                        ...styles.progressFill,
                        width: `${(area.total_kg / stats.scrap_por_area[0].total_kg) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Estadísticas Detalladas */}
          <div style={styles.detailedStats}>
            <div style={styles.detailedColumn}>
              <h3>🕒 Scrap por Turno</h3>
              {adminStats?.por_turno?.map((turno, index) => (
                <div key={index} style={styles.turnoCard}>
                  <span>Turno {turno.turno}</span>
                  <span>{turno.total_kg} kg</span>
                  <span>({turno.count} registros)</span>
                </div>
              ))}
            </div>

            <div style={styles.detailedColumn}>
              <h3>🎯 Recepciones por Destino</h3>
              {stats?.recepciones_por_destino?.map((destino, index) => (
                <div key={index} style={styles.destinoCard}>
                  <span>
                    {destino.destino === 'reciclaje' ? '♻️' : 
                     destino.destino === 'venta' ? '💰' : '🏪'} 
                    {destino.destino}
                  </span>
                  <span>{destino.total_kg} kg</span>
                  <span>({destino.count})</span>
                </div>
              ))}
            </div>

            <div style={styles.detailedColumn}>
              <h3>📦 Stock Disponible</h3>
              {adminStats?.stock_disponible?.map((stock, index) => (
                <div key={index} style={styles.stockCard}>
                  <span>{stock.tipo_material.toUpperCase()}</span>
                  <span>{stock.cantidad_total} kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actividad Reciente */}
          <section style={styles.activitySection}>
            <h2>🕒 Actividad Reciente</h2>
            
            <div style={styles.activityGrid}>
              <div style={styles.activityCard}>
                <h3>📝 Últimos Registros</h3>
                {recentActivity?.registros?.length > 0 ? (
                  <div style={styles.activityList}>
                    {recentActivity.registros.map(registro => (
                      <div key={registro.id} style={styles.activityItem}>
                        <div style={styles.activityHeader}>
                          <strong>{registro.peso_total}kg</strong> de {registro.tipo_material}
                        </div>
                        <div style={styles.activityDetails}>
                          {getAreaLabel(registro.area_real)} - {registro.maquina_real}
                          <br />
                          <small>Por: {registro.operador?.name} · Turno {registro.turno}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No hay registros recientes</p>
                )}
              </div>

              <div style={styles.activityCard}>
                <h3>🏷️ Últimas Recepciones</h3>
                {recentActivity?.recepciones?.length > 0 ? (
                  <div style={styles.activityList}>
                    {recentActivity.recepciones.map(recepcion => (
                      <div key={recepcion.id} style={styles.activityItem}>
                        <div style={styles.activityHeader}>
                          <strong>HU: {recepcion.numero_hu}</strong>
                        </div>
                        <div style={styles.activityDetails}>
                          {recepcion.peso_kg}kg de {recepcion.tipo_material}
                          <br />
                          <small>Receptor: {recepcion.receptor?.name} · {recepcion.destino}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No hay recepciones recientes</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'users' && (
        <section style={styles.usersSection}>
          <UserManagement />
        </section>
      )}

      {activeTab === 'reports' && (
        <section style={styles.reportsSection}>
          <h2>📈 Reportes y Análisis</h2>
          <div style={styles.reportsGrid}>
            <div style={styles.reportCard}>
              <h3>📊 Top Áreas</h3>
              {adminStats?.top_areas?.map((area, index) => (
                <div key={index} style={styles.reportItem}>
                  <span>{getAreaLabel(area.area_real)}</span>
                  <span>{area.total_kg} kg</span>
                </div>
              ))}
            </div>

            <div style={styles.reportCard}>
              <h3>📦 Materiales Más Recibidos</h3>
              {adminStats?.top_materiales?.map((material, index) => (
                <div key={index} style={styles.reportItem}>
                  <span>{material.tipo_material.toUpperCase()}</span>
                  <span>{material.total_kg} kg</span>
                </div>
              ))}
            </div>

            <div style={styles.reportCard}>
              <h3>📋 Totales Generales</h3>
              <div style={styles.reportItem}>
                <span>Usuarios</span>
                <span>{adminStats?.totales_generales?.usuarios}</span>
              </div>
              <div style={styles.reportItem}>
                <span>Registros</span>
                <span>{adminStats?.totales_generales?.registros}</span>
              </div>
              <div style={styles.reportItem}>
                <span>Recepciones</span>
                <span>{adminStats?.totales_generales?.recepciones}</span>
              </div>
              <div style={styles.reportItem}>
                <span>Stock Total</span>
                <span>{adminStats?.totales_generales?.stock_total} kg</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
  },
  tab: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  activeTab: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
  },
  statsSection: {
    marginBottom: '2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '0.5rem 0',
  },
  statSubtitle: {
    fontSize: '0.875rem',
    color: '#6c757d',
    margin: 0,
  },
  distributionSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  distributionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  areaCard: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '4px',
  },
  areaPeso: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#28a745',
    margin: '0.5rem 0',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    transition: 'width 0.3s ease',
  },
  detailedStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  detailedColumn: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  turnoCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  destinoCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  stockCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  activitySection: {
    marginBottom: '2rem',
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    marginTop: '1rem',
  },
  activityCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  activityList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  activityItem: {
    padding: '1rem',
    borderBottom: '1px solid #f0f0f0',
  },
  activityHeader: {
    fontWeight: 'bold',
    marginBottom: '0.25rem',
  },
  activityDetails: {
    fontSize: '0.875rem',
    color: '#6c757d',
  },
  usersSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  reportsSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  reportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  reportCard: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
  },
  reportItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e0e0e0',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem',
  },
};

export default AdminDashboard;