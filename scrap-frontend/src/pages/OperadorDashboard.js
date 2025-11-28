/* src/pages/OperadorDashboard.js */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import RegistroScrapCompleto from '../components/RegistroScrapCompleto';
import ExcelExportButtons from '../components/ExcelExportButtons';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const OperadorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false); // ✅ NUEVO ESTADO PARA CARGA DEL MODAL

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

  // ✅ NUEVA FUNCIÓN PARA MANEJAR LA APERTURA DEL MODAL
  const handleOpenModal = () => {
    setModalLoading(true); // Activar loading del modal
    setShowModal(true);
    // El loading se desactivará cuando el componente RegistroScrapCompleto termine de cargar
  };

  // ✅ NUEVA FUNCIÓN PARA MANEJAR CUANDO EL MODAL TERMINA DE CARGAR
  const handleModalLoaded = () => {
    setModalLoading(false);
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
          <button onClick={handleOpenModal} style={styles.primaryButton}>
            <span>➕</span> Nuevo Registro
          </button>
        </div>
      </div>

      {/* Filtros & Tabla */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>📋 Registros Recientes</h3>
          <div style={styles.filters}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Área:</label>
              <select
                name="area"
                value={filtros.area}
                onChange={handleFiltroChange}
                style={styles.select}
              >
                <option value="">Todas</option>
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
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Turno:</label>
              <select
                name="turno"
                value={filtros.turno}
                onChange={handleFiltroChange}
                style={styles.select}
              >
                <option value="">Todos</option>
                <option value="1">Turno 1</option>
                <option value="2">Turno 2</option>
                <option value="3">Turno 3</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Fecha:</label>
              <input
                type="date"
                name="fecha"
                value={filtros.fecha}
                onChange={handleFiltroChange}
                style={styles.input}
              />
            </div>

            <ExcelExportButtons
              tipo="formato-empresa"
              filters={filtros}
              buttonText="📊 Generar Reporte"
              buttonStyle={styles.reportButton}
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
              <div>
                <h3 style={styles.modalTitle}>Registro Completo de Scrap</h3>
                <p style={styles.modalSubtitle}>Complete los datos de producción para todas las máquinas</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>
            <div style={styles.modalContent}>
              {/* ✅ MOSTRAR SPINNER MIENTRAS CARGA EL MODAL */}
              {modalLoading && (
                <div style={styles.modalLoading}>
                  <div style={styles.modalSpinner}></div>
                  <p style={styles.modalLoadingText}>Cargando configuración de máquinas...</p>
                </div>
              )}
              <RegistroScrapCompleto
                onRegistroCreado={handleRegistroCreado}
                onCancelar={() => setShowModal(false)}
                onLoadComplete={handleModalLoaded} // ✅ PROP NUEVA PARA NOTIFICAR CUANDO TERMINA DE CARGAR
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
    padding: spacing.lg,
    backgroundColor: colors.background,
    minHeight: '100vh',
    fontFamily: typography.fontFamily
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.md
  },
  headerActions: {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'center'
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
  subtitle: {
    color: colors.gray600,
    fontSize: typography.sizes.lg,
    margin: `${spacing.xs} 0 0 0`,
    fontWeight: typography.weights.medium
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: colors.background
  },
  loadingContent: {
    textAlign: 'center',
    color: colors.gray500
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${colors.gray200}`,
    borderTop: `4px solid ${colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: `0 auto ${spacing.md}`
  },
  
  // ✅ NUEVOS ESTILOS PARA EL LOADING DEL MODAL
  modalLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: radius.lg
  },
  modalSpinner: {
    width: '50px',
    height: '50px',
    border: `4px solid ${colors.gray200}`,
    borderTop: `4px solid ${colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: spacing.md
  },
  modalLoadingText: {
    fontSize: typography.sizes.lg,
    color: colors.gray600,
    fontWeight: typography.weights.medium,
    textAlign: 'center'
  },
  card: {
    ...baseComponents.card,
    overflow: 'hidden',
    marginBottom: spacing.lg
  },
  cardHeader: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.gray50
  },
  cardTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.gray800,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs
  },
  filters: {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'flex-end', // Alinear al fondo para que coincida con los labels
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },
  filterLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  // SELECTS MÁS PEQUEÑOS
  select: {
    ...baseComponents.select,
    padding: `0 ${spacing.sm}`,
    height: '36px',
    minWidth: '120px',
    maxWidth: '140px',
    boxSizing: 'border-box',
    fontSize: typography.sizes.sm,
    lineHeight: '36px',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: `right ${spacing.xs} center`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '14px 14px',
    paddingRight: '32px'
  },
  // INPUT MÁS PEQUEÑO
  input: {
    ...baseComponents.input,
    padding: `0 ${spacing.sm}`,
    height: '36px',
    minWidth: '120px',
    maxWidth: '140px',
    boxSizing: 'border-box',
    fontSize: typography.sizes.sm,
    lineHeight: '36px'
  },
  reportButton: {
    ...baseComponents.buttonPrimary,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    height: '36px',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    backgroundColor: colors.success,
    border: `1px solid ${colors.success}`,
    ':hover': {
      backgroundColor: colors.secondaryHover,
      transform: 'translateY(-1px)',
      boxShadow: shadows.md
    }
  },
  primaryButton: {
    ...baseComponents.buttonPrimary,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.lg}`,
    height: '42px'
  },
  tableContainer: {
    overflowX: 'auto',
    maxHeight: '600px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1400px'
  },
  th: {
    padding: spacing.md,
    textAlign: 'left',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.gray600,
    textTransform: 'uppercase',
    backgroundColor: colors.gray50,
    borderBottom: `2px solid ${colors.gray200}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: `1px solid ${colors.gray200}`,
    transition: 'background-color 0.2s ease'
  },
  basculaRow: {
    backgroundColor: colors.primaryLight + '20',
    borderLeft: `3px solid ${colors.primary}`
  },
  manualRow: {
    backgroundColor: colors.warning + '10',
    borderLeft: `3px solid ${colors.warning}`
  },
  td: {
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.gray700,
    borderBottom: `1px solid ${colors.gray200}`,
    whiteSpace: 'nowrap'
  },
  numericCell: {
    textAlign: 'right',
    fontFamily: typography.fontMono,
    fontWeight: typography.weights.medium
  },
  totalCell: {
    textAlign: 'right',
    fontFamily: typography.fontMono,
    fontWeight: typography.weights.bold,
    color: colors.success
  },
  turnoBadge: {
    backgroundColor: colors.gray200,
    color: colors.gray700,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold
  },
  areaTag: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase'
  },
  badgeSuccess: {
    backgroundColor: colors.secondaryLight,
    color: colors.secondary,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs
  },
  badgeWarn: {
    backgroundColor: colors.warning + '20',
    color: colors.warning,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs
  },
  loteCode: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.xs,
    backgroundColor: colors.gray100,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    color: colors.gray600
  },
  resumenContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.gray50,
    borderTop: `1px solid ${colors.gray200}`
  },
  resumenItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    textAlign: 'center'
  },
  resumenLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray600,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  resumenValue: {
    fontSize: typography.sizes.lg,
    color: colors.gray900,
    fontWeight: typography.weights.bold
  },
  emptyState: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.gray500
  },
  emptyStateIcon: {
    fontSize: '4rem',
    marginBottom: spacing.md,
    opacity: 0.5
  },
  emptyStateText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    color: colors.gray700
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.base,
    opacity: 0.7,
    marginBottom: spacing.lg
  },
   modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: spacing.md,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    width: '95%',
    maxWidth: '1400px',
    maxHeight: '95vh',
    overflow: 'hidden',
    boxShadow: shadows.xl,
    border: `1px solid ${colors.gray200}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative' // ✅ IMPORTANTE: Para posicionar el loading absoluto
  },
  modalHeader: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.gray50,
    flexShrink: 0
  },
  modalTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    color: colors.gray900,
    margin: 0,
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  modalSubtitle: {
    fontSize: typography.sizes.lg,
    color: colors.gray600,
    margin: `${spacing.xs} 0 0 0`
  },
  modalContent: {
    flex: 1,
    overflow: 'auto',
    padding: 0,
    position: 'relative' // ✅ IMPORTANTE: Para posicionar el loading absoluto
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: colors.gray500,
    padding: spacing.xs,
    borderRadius: radius.sm,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    ':hover': {
      backgroundColor: colors.gray200,
      color: colors.gray700
    }
  },
  primaryButton: {
    ...baseComponents.buttonPrimary,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.lg}`,
    height: '42px'
  }
};

// Agregar la animación del spinner
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