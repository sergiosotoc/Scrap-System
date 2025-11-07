// src/pages/OperadorDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import RegistroScrapCompleto from '../components/RegistroScrapCompleto';

const OperadorDashboard = () => {
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    area: '',
    turno: '',
    fecha: ''
  });

  useEffect(() => {
    loadOperadorData();
  }, [filtros]);

  const loadOperadorData = async () => {
    try {
      const [registrosData, statsData] = await Promise.all([
        apiClient.getRegistrosScrap(filtros),
        apiClient.getRegistroScrapStats()
      ]);

      setRegistros(registrosData);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando datos del operador:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      area: '',
      turno: '',
      fecha: ''
    });
  };

  // Traducir tipo de material
  const getMaterialLabel = (tipo) => {
    const materiales = {
      cobre: 'Cobre',
      aluminio: 'Aluminio',
      mixto: 'Mixto'
    };
    return materiales[tipo] || tipo;
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

  const generarReporteGeneral = async () => {
    try {
      const fecha = new Date().toISOString().split('T')[0];

      const token = localStorage.getItem('authToken');
      const url = `http://localhost:8000/api/registros-scrap/generar-reporte-diario`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha: fecha
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `reporte_general_${fecha}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      alert('📄 Reporte general PDF generado exitosamente!');

    } catch (error) {
      alert('❌ Error generando reporte: ' + error.message);
    }
  };

  if (loading) {
    return <div style={styles.loading}>📊 Cargando dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1>👨‍💼 Dashboard - Operador de Logística</h1>
          <p>Bienvenido, {user.name}</p>
        </div>
        <div style={styles.headerButtons}>
          <button onClick={generarReporteGeneral} style={styles.reporteButton}>
            📊 Generar Reporte PDF
          </button>
          <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
            ➕ Nuevo Registro
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <section style={styles.statsSection}>
        <h2>📈 Mis Estadísticas</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>📋 Total Registros</h3>
            <p style={styles.statNumber}>{stats?.total_registros || 0}</p>
          </div>
          <div style={styles.statCard}>
            <h3>⚖️ Peso Total</h3>
            <p style={styles.statNumber}>{stats?.total_peso_kg || 0} kg</p>
          </div>
          <div style={styles.statCard}>
            <h3>⏳ Pendientes</h3>
            <p style={styles.statNumber}>{stats?.pendientes || 0}</p>
          </div>
          <div style={styles.statCard}>
            <h3>⚖️ Con Báscula</h3>
            <p style={styles.statNumber}>{stats?.registros_bascula || 0}</p>
          </div>
        </div>

        {/* Distribución por Área */}
        {stats?.por_area && stats.por_area.length > 0 && (
          <div style={styles.areasSection}>
            <h3>🏭 Distribución por Área</h3>
            <div style={styles.areasGrid}>
              {stats.por_area.map((area, index) => (
                <div key={index} style={styles.areaCard}>
                  <h4>{getAreaLabel(area.area_real)}</h4>
                  <p>{area.total_kg} kg</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Filtros */}
      <section style={styles.filtrosSection}>
        <h3>🔍 Filtros</h3>
        <div style={styles.filtrosGrid}>
          <div style={styles.filtroGroup}>
            <label>Área:</label>
            <select name="area" value={filtros.area} onChange={handleFiltroChange}>
              <option value="">Todas las áreas</option>
              <option value="TREFILADO">Trefilado</option>
              <option value="BUNCHER">Buncher</option>
              <option value="EXTRUSION">Extrusión</option>
              <option value="XLPE">XLPE</option>
              <option value="EBEAM">E-Beam</option>
              <option value="RWD">Rewind</option>
              <option value="OTHERS">Otros</option>
            </select>
          </div>
          <div style={styles.filtroGroup}>
            <label>Turno:</label>
            <select name="turno" value={filtros.turno} onChange={handleFiltroChange}>
              <option value="">Todos los turnos</option>
              <option value="1">Turno 1</option>
              <option value="2">Turno 2</option>
              <option value="3">Turno 3</option>
            </select>
          </div>
          <div style={styles.filtroGroup}>
            <label>Fecha:</label>
            <input
              type="date"
              name="fecha"
              value={filtros.fecha}
              onChange={handleFiltroChange}
            />
          </div>
          <div style={styles.filtroGroup}>
            <button onClick={limpiarFiltros} style={styles.secondaryButton}>
              🗑️ Limpiar
            </button>
          </div>
        </div>
      </section>

      {/* Lista de Registros Recientes */}
      <section style={styles.registrosSection}>
        <h2>📋 Mis Registros Recientes</h2>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Turno</th>
                <th style={styles.th}>Área/Máquina</th>
                <th style={styles.th}>Peso Total</th>
                <th style={styles.th}>Material</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(registro => (
                <tr key={registro.id} style={styles.tr}>
                  <td style={styles.td}>
                    {new Date(registro.fecha_registro).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>Turno {registro.turno}</td>
                  <td style={styles.td}>
                    <div>{getAreaLabel(registro.area_real)}</div>
                    <div style={styles.maquina}>{registro.maquina_real}</div>
                  </td>
                  <td style={styles.td}>
                    <strong>{registro.peso_total} kg</strong>
                  </td>
                  <td style={styles.td}>{getMaterialLabel(registro.tipo_material)}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.status,
                      ...(registro.estado === 'pendiente' ? styles.pendiente : styles.recibido)
                    }}>
                      {registro.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Recibido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {registros.length === 0 && (
            <div style={styles.emptyState}>
              📝 No hay registros de scrap. ¡Crea tu primer registro!
            </div>
          )}
        </div>
      </section>

      {/* Modal para crear nuevo registro */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>📝 Nuevo Registro de Scrap</h3>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <RegistroScrapCompleto />
            </div>
          </div>
        </div>
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
    alignItems: 'center',
    marginBottom: '2rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  statsSection: {
    marginBottom: '2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '0.5rem 0 0 0',
  },
  areasSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  areasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  areaCard: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '4px',
    textAlign: 'center',
  },
  filtrosSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  filtrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    alignItems: 'end',
  },
  filtroGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  registrosSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
  },
  tr: {
    borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '1rem',
  },
  maquina: {
    fontSize: '0.875rem',
    color: '#6c757d',
  },
  status: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 'bold',
  },
  pendiente: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  recibido: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '95%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #dee2e6',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6c757d',
  },
  modalContent: {
    maxHeight: 'calc(90vh - 80px)',
    overflowY: 'auto',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6c757d',
    fontSize: '1.1rem',
  },
  headerButtons: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  reporteButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
};

export default OperadorDashboard;