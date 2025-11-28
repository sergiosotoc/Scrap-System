/* src/pages/OperadorDashboard.js */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import RegistroScrapCompleto from '../components/RegistroScrapCompleto';
import ExcelExportButtons from '../components/ExcelExportButtons';

const OperadorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filtros, setFiltros] = useState({ 
    area: '', 
    turno: '', 
    fecha: new Date().toISOString().split('T')[0] 
  });

  const loadOperadorData = useCallback(async () => {
    setLoading(true);
    try {
      const [registrosData, statsData] = await Promise.all([
        apiClient.getRegistrosScrap(filtros),
        apiClient.getRegistroScrapStats()
      ]);
      setRegistros(Array.isArray(registrosData) ? registrosData : []);
      setStats(statsData);
    } catch (error) {
      addToast('Error cargando datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filtros, addToast]);

  useEffect(() => {
    loadOperadorData();
  }, [loadOperadorData]);

  const handleFiltroChange = (e) => {
    setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegistroCreado = () => {
    setShowModal(false);
    addToast('Registro creado correctamente', 'success');
    loadOperadorData();
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Operador</h1>
          <p style={styles.subtitle}>Hola, {user.name} 👋</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
            ➕ Nuevo Registro
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.gridStats}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <span style={styles.statLabel}>Registros Totales</span>
          <span style={styles.statNumber}>{stats?.total_registros || 0}</span>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⚖️</div>
          <span style={styles.statLabel}>Peso Total</span>
          <span style={styles.statNumber}>
            {stats?.total_peso_kg ? parseFloat(stats.total_peso_kg).toFixed(2) : '0.00'} 
            <small style={styles.unit}>kg</small>
          </span>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔌</div>
          <span style={styles.statLabel}>Con Báscula</span>
          <span style={styles.statNumber}>{stats?.registros_bascula || 0}</span>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📅</div>
          <span style={styles.statLabel}>Registros Hoy</span>
          <span style={styles.statNumber}>{stats?.registros_hoy || 0}</span>
        </div>
      </div>

      {/* Filtros & Tabla */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>📋 Registros Recientes</h3>
          <div style={styles.filters}>
            <select 
              name="area" 
              value={filtros.area}
              onChange={handleFiltroChange} 
              style={styles.smallSelect}
            >
              <option value="">Todas Áreas</option>
              <option value="TREFILADO">Trefilado</option>
              <option value="BUNCHER">Buncher</option>
              <option value="EXTRUSION">Extrusión</option>
              <option value="XLPE">XLPE</option>
              <option value="EBEAM">E-Beam</option>
              <option value="RWD">RWD</option>
              <option value="BATERIA">Batería</option>
              <option value="CABALLE">Caballe</option>
              <option value="OTHERS">Otros</option>
              <option value="FPS">FPS</option>
            </select>
            <select 
              name="turno" 
              value={filtros.turno}
              onChange={handleFiltroChange} 
              style={styles.smallSelect}
            >
              <option value="">Todos Turnos</option>
              <option value="1">Turno 1</option>
              <option value="2">Turno 2</option>
              <option value="3">Turno 3</option>
            </select>
            <input
              type="date"
              name="fecha"
              value={filtros.fecha}
              onChange={handleFiltroChange}
              style={styles.smallSelect}
            />
            
            {/* SOLO FORMATO EMPRESA */}
            <ExcelExportButtons
              tipo="formato-empresa"
              filters={filtros}
            />
          </div>
        </div>

        <div style={styles.tableContainer}>
          {registros.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Hora</th>
                  <th style={styles.th}>Turno</th>
                  <th style={styles.th}>Área</th>
                  <th style={styles.th}>Máquina</th>
                  <th style={styles.th}>Cobre (kg)</th>
                  <th style={styles.th}>Cobre Est. (kg)</th>
                  <th style={styles.th}>Purga PVC (kg)</th>
                  <th style={styles.th}>Purga PE (kg)</th>
                  <th style={styles.th}>Cable PVC (kg)</th>
                  <th style={styles.th}>Cable PE (kg)</th>
                  <th style={styles.th}>Total (kg)</th>
                  <th style={styles.th}>Método</th>
                  <th style={styles.th}>Lote</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr 
                    key={r.id} 
                    style={{
                      ...styles.tr,
                      ...(r.conexion_bascula ? styles.basculaRow : styles.manualRow)
                    }}
                  >
                    <td style={styles.td}>
                      {new Date(r.fecha_registro).toLocaleDateString('es-ES')}
                    </td>
                    <td style={styles.td}>
                      {new Date(r.fecha_registro).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.turnoBadge}>T{r.turno}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.areaTag}>{r.area_real}</span>
                    </td>
                    <td style={styles.td}>
                      <strong>{r.maquina_real}</strong>
                    </td>
                    <td style={{ ...styles.td, ...styles.numericCell }}>
                      {parseFloat(r.peso_cobre || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, ...styles.numericCell }}>
                      {parseFloat(r.peso_cobre_estanado || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, ...styles.numericCell }}>
                      {parseFloat(r.peso_purga_pvc || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, ...styles.numericCell }}>
                      {parseFloat(r.peso_purga_pe || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, ...styles.numericCell }}>
                      {parseFloat(r.peso_cable_pvc || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, ...styles.numericCell }}>
                      {parseFloat(r.peso_cable_pe || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, ...styles.totalCell }}>
                      <strong>{parseFloat(r.peso_total || 0).toFixed(2)}</strong>
                    </td>
                    <td style={styles.td}>
                      {r.conexion_bascula ? (
                        <span style={styles.badgeSuccess}>
                          ⚖️ Báscula
                        </span>
                      ) : (
                        <span style={styles.badgeWarn}>
                          ✍️ Manual
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <code style={styles.loteCode}>
                        {r.numero_lote || 'N/A'}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>📭</div>
              <h3 style={styles.emptyStateText}>No hay registros</h3>
              <p style={styles.emptyStateSubtext}>
                No se encontraron registros con los filtros seleccionados
              </p>
              <button 
                onClick={() => setShowModal(true)}
                style={styles.primaryButton}
              >
                ➕ Crear Primer Registro
              </button>
            </div>
          )}
        </div>

        {/* Información de resumen */}
        {registros.length > 0 && (
          <div style={styles.resumenContainer}>
            <div style={styles.resumenItem}>
              <span style={styles.resumenLabel}>Total de registros:</span>
              <span style={styles.resumenValue}>{registros.length}</span>
            </div>
            <div style={styles.resumenItem}>
              <span style={styles.resumenLabel}>Peso total filtrado:</span>
              <span style={styles.resumenValue}>
                {registros
                  .reduce((total, r) => total + (parseFloat(r.peso_total) || 0), 0)
                  .toFixed(2)} kg
              </span>
            </div>
            <div style={styles.resumenItem}>
              <span style={styles.resumenLabel}>Registros con báscula:</span>
              <span style={styles.resumenValue}>
                {registros.filter(r => r.conexion_bascula).length}
              </span>
            </div>
            <div style={styles.resumenItem}>
              <span style={styles.resumenLabel}>Promedio por registro:</span>
              <span style={styles.resumenValue}>
                {(
                  registros.reduce((total, r) => total + (parseFloat(r.peso_total) || 0), 0) / 
                  registros.length
                ).toFixed(2)} kg
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal con RegistroScrapCompleto */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Registro Masivo de Scrap</h3>
              <button 
                onClick={() => setShowModal(false)} 
                style={styles.closeBtn}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>
            <div style={styles.modalContent}>
              <RegistroScrapCompleto
                onRegistroCreado={handleRegistroCreado}
                onCancelar={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    backgroundColor: '#F3F4F6',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },

  headerActions: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },

  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#111827',
    margin: 0,
    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },

  subtitle: {
    color: '#6B7280',
    fontSize: '1.1rem',
    margin: '0.5rem 0 0 0',
    fontWeight: '500'
  },

  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#F3F4F6'
  },

  loadingContent: {
    textAlign: 'center',
    color: '#6B7280'
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E7EB',
    borderTop: '4px solid #2563EB',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
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
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    textAlign: 'center',
    border: '1px solid #E5E7EB',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden'
  },

  statIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    opacity: 0.8
  },

  statLabel: {
    fontSize: '0.875rem',
    color: '#6B7280',
    fontWeight: '600',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem'
  },

  statNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#111827',
    display: 'block'
  },

  unit: {
    fontSize: '1rem',
    fontWeight: '400',
    color: '#6B7280',
    marginLeft: '0.25rem'
  },

  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    border: '1px solid #E5E7EB',
    marginBottom: '2rem'
  },

  cardHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    backgroundColor: '#F9FAFB'
  },

  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },

  filters: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  smallSelect: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '0.875rem',
    minWidth: '140px',
    backgroundColor: 'white',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    ':focus': {
      outline: 'none',
      borderColor: '#3B82F6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },

  tableContainer: {
    overflowX: 'auto',
    maxHeight: '600px'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1400px',
    fontSize: '0.875rem'
  },

  th: {
    padding: '0.875rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    backgroundColor: '#F9FAFB',
    borderBottom: '2px solid #E5E7EB',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap'
  },

  tr: {
    borderBottom: '1px solid #F3F4F6',
    transition: 'background-color 0.2s ease'
  },

  basculaRow: {
    backgroundColor: '#F0F9FF',
    borderLeft: '3px solid #0EA5E9'
  },

  manualRow: {
    backgroundColor: '#FFFBEB',
    borderLeft: '3px solid #F59E0B'
  },

  td: {
    padding: '0.875rem 0.75rem',
    fontSize: '0.875rem',
    color: '#374151',
    borderBottom: '1px solid #F3F4F6',
    whiteSpace: 'nowrap'
  },

  numericCell: {
    textAlign: 'right',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    fontWeight: '500'
  },

  totalCell: {
    textAlign: 'right',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    fontWeight: '700',
    color: '#059669'
  },

  turnoBadge: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },

  areaTag: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase'
  },

  badgeSuccess: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem'
  },

  badgeWarn: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem'
  },

  loteCode: {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    fontSize: '0.75rem',
    backgroundColor: '#F3F4F6',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: '#6B7280'
  },

  primaryButton: {
    backgroundColor: '#2563EB',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    textDecoration: 'none',
    ':hover': {
      backgroundColor: '#1D4ED8',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }
  },

  resumenContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    padding: '1.25rem 1.5rem',
    backgroundColor: '#F8FAFC',
    borderTop: '1px solid #E5E7EB'
  },

  resumenItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    textAlign: 'center'
  },

  resumenLabel: {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },

  resumenValue: {
    fontSize: '1.125rem',
    color: '#111827',
    fontWeight: '700'
  },

  emptyState: {
    padding: '4rem 2rem',
    textAlign: 'center',
    color: '#6B7280'
  },

  emptyStateIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.5
  },

  emptyStateText: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#374151'
  },

  emptyStateSubtext: {
    fontSize: '1rem',
    opacity: 0.7,
    marginBottom: '2rem'
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Más oscuro para mejor contraste
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Z-index más alto
    padding: '1rem',
    backdropFilter: 'blur(4px)'
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '1400px',
    maxHeight: '95vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column'
  },

  modalHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    flexShrink: 0 // Evita que se encoja
  },

  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },

  modalContent: {
    flex: 1,
    overflow: 'auto', // Permite scroll si es necesario
    padding: 0
  },

  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '0.25rem',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    ':hover': {
      backgroundColor: '#F3F4F6',
      color: '#374151'
    }
  }
};

// Agregar keyframes para la animación del spinner
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

export default OperadorDashboard;