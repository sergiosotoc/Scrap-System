/* src/pages/OperadorDashboard.js */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import RegistroScrapCompleto from '../components/RegistroScrapCompleto';
import ExcelExportButtons from '../components/ExcelExportButtons';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';
import SmoothButton from '../components/SmoothButton';
import SmoothInput from '../components/SmoothInput';
import LoadingSpinner from '../components/LoadingSpinner';
import CardTransition from '../components/CardTransition';
import PageWrapper from '../components/PageWrapper';

const AnimatedCounter = ({ value, duration = 1000, decimals = 2 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = 0;
    const endValue = parseFloat(value) || 0;
    
    if (endValue === 0) {
        setCount(0);
        return;
    }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(2, -10 * progress);
      
      const current = easeOut * (endValue - startValue) + startValue;
      setCount(current);
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };
    
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

const OperadorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.keyCode === 27 || event.key === 'Escape') {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscKey);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => { 
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showModal]);

  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTurnoActual = () => {
    const hora = new Date().getHours();
    if (hora >= 7 && hora < 15) return '1';
    else if (hora >= 15 && hora < 23) return '2';
    else return '3';
  };

  const today = getTodayLocal();
  const [fechaInput, setFechaInput] = useState(today);
  const [filtros, setFiltros] = useState({
    area: '',
    turno: getTurnoActual(),
    fecha: today
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros(prev => {
        if (prev.fecha === fechaInput) return prev;
        return { ...prev, fecha: fechaInput };
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [fechaInput]);

  const loadOperadorData = useCallback(async () => {
    if (!filtros.fecha) return;
    setIsFetching(true);
    
    try {
      const [registrosData, configData] = await Promise.all([
        apiClient.getRegistrosScrap(filtros),
        apiClient.getRegistrosConfig()
      ]);
      setRegistros(Array.isArray(registrosData) ? registrosData : []);
      setConfig(configData);
      
    } catch (error) {
      addToast('Error cargando datos: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [filtros, addToast]); 

  useEffect(() => {
    loadOperadorData();
  }, [loadOperadorData]);

  // Aplanar materiales para las columnas de la tabla - VERSIÓN MEJORADA
  const materialesColumns = useMemo(() => {
    if (!config || !config.tipos_scrap) return [];
    
    // Si la API devuelve array directo (NUEVO COMPORTAMIENTO)
    if (Array.isArray(config.tipos_scrap)) {
        return config.tipos_scrap.sort((a, b) => a.orden - b.orden);
    } 
    
    // Fallback por si la API aún devuelve objeto (comportamiento antiguo)
    let flat = [];
    Object.values(config.tipos_scrap).forEach(grupo => {
        if (Array.isArray(grupo)) {
            flat = [...flat, ...grupo];
        }
    });
    return flat.sort((a, b) => a.orden - b.orden);
  }, [config]);

  // Función auxiliar para extraer pesos de un registro
  const extraerPesoDeRegistro = useCallback((registro, material) => {
    // Método 1: Buscar en materiales_resumen (array de objetos)
    if (registro.materiales_resumen && Array.isArray(registro.materiales_resumen)) {
      const detalle = registro.materiales_resumen.find(d => {
        // Buscar por nombre o por ID si está disponible
        return d.nombre === material.tipo_nombre || 
               (material.id && d.id === material.id) ||
               (material.id && d.tipo_scrap_id === material.id);
      });
      if (detalle) {
        return parseFloat(detalle.peso) || 0;
      }
    }
    
    // Método 2: Buscar en pesos_detalle (objeto con claves)
    if (registro.pesos_detalle && typeof registro.pesos_detalle === 'object') {
      // Intentar con diferentes formatos de clave
      const posiblesClaves = [
        `material_${material.id}`,
        material.columna_db,
        material.tipo_nombre.toLowerCase().replace(/ /g, '_')
      ];
      
      for (const clave of posiblesClaves) {
        if (registro.pesos_detalle[clave] !== undefined) {
          return parseFloat(registro.pesos_detalle[clave]) || 0;
        }
      }
    }
    
    return 0;
  }, []);

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleFechaChange = (e) => {
    setFechaInput(e.target.value);
  };

  const handleRegistroCreado = () => {
    setShowModal(false);
    addToast('Registro creado correctamente', 'success');
    loadOperadorData();
  };

  const handleOpenModal = () => {
    setModalLoading(true);
    setShowModal(true);
  };

  const handleModalLoaded = () => {
    setTimeout(() => setModalLoading(false), 100);
  };

  const styles = {
    container: {
      backgroundColor: colors.background,
      fontFamily: typography.fontFamily,
      animation: 'fadeIn 0.5s ease-out',
      boxSizing: 'border-box',
      width: '100%',
      height: 'auto' 
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
    loadingPage: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%', 
      minHeight: '50vh', 
      backgroundColor: colors.background,
      flexDirection: 'column'
    },
    modalLoading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20, 
      borderRadius: radius.lg
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
      zIndex: 9999,
      padding: spacing.md,
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease-out'
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      width: '98%', 
      maxWidth: '1400px',
      maxHeight: '90vh',
      height: 'auto',
      overflow: 'hidden',
      boxShadow: shadows.xl,
      border: `1px solid ${colors.gray200}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      animation: 'slideInUp 0.3s ease-out',
      boxSizing: 'border-box',
      margin: 'auto'
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
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: 0,
      position: 'relative',
      paddingBottom: '20px' 
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '1.2rem',
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
    card: {
      ...baseComponents.card,
      overflow: 'hidden',
      marginBottom: spacing.lg,
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
    miniLoader: {
      fontSize: typography.sizes.sm,
      color: colors.primary,
      fontWeight: typography.weights.medium,
      marginLeft: spacing.md,
      animation: 'pulse 1.5s infinite'
    },
    filters: {
      display: 'flex',
      gap: spacing.md,
      alignItems: 'flex-end',
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
      minWidth: '1000px'
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
      transition: 'background-color 0.2s ease, opacity 0.4s ease, transform 0.4s ease',
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
      ...baseComponents.badge,
      backgroundColor: colors.gray200,
      color: colors.gray700
    },
    areaTag: {
      ...baseComponents.badge,
      backgroundColor: colors.primaryLight,
      color: colors.primary,
      textTransform: 'uppercase'
    },
    badgeSuccess: {
      ...baseComponents.badge,
      backgroundColor: colors.secondaryLight,
      color: colors.secondary,
      gap: spacing.xs
    },
    badgeWarn: {
      ...baseComponents.badge,
      backgroundColor: colors.warning + '20',
      color: colors.warning,
      gap: spacing.xs
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
    // Estilo especial para cuando hay muchas columnas dinámicas
    dynamicHeader: {
        minWidth: '90px',
        textAlign: 'center',
        padding: '8px',
        fontSize: '0.7rem'
    },
    materialHeaderName: {
        display: 'block',
        fontSize: '0.65rem',
        fontWeight: typography.weights.bold,
        lineHeight: 1.1,
        marginBottom: '2px'
    },
    materialHeaderUnit: {
        display: 'block',
        fontSize: '0.55rem',
        color: colors.gray500,
        fontStyle: 'italic'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <LoadingSpinner message="Cargando dashboard..." />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageWrapper style={{ height: 'auto' }}>
        {/* Header */}
        <CardTransition delay={0} style={styles.header}>
            <div>
            <h1 style={styles.title}>Dashboard Operador</h1>
            <p style={styles.subtitle}>Bienvenido, {user?.name || 'Operador'}</p>
            </div>
            <div style={styles.headerActions}>
            <SmoothButton 
                onClick={handleOpenModal} 
                style={styles.primaryButton}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nuevo Registro
            </SmoothButton>
            </div>
        </CardTransition>

        <CardTransition delay={100} style={styles.card}>
            <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Registros Recientes
                {isFetching && <span style={styles.miniLoader}>Actualizando...</span>}
            </h3>
            <div style={styles.filters}>
                <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Área:</label>
                <select name="area" value={filtros.area} onChange={handleSelectChange} style={styles.select}>
                    <option value="">Todas</option>
                    {config?.areas_maquinas ? Object.keys(config.areas_maquinas).map(area => (
                        <option key={area} value={area}>{area}</option>
                    )) : null}
                </select>
                </div>
                <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Turno:</label>
                <select name="turno" value={filtros.turno} onChange={handleSelectChange} style={styles.select}>
                    <option value="">Todos</option>
                    <option value="1">Turno 1</option>
                    <option value="2">Turno 2</option>
                    <option value="3">Turno 3</option>
                </select>
                </div>
                <div style={styles.filterGroup}>
                <SmoothInput label="Fecha:" type="date" name="fecha" value={fechaInput} onChange={handleFechaChange} style={{...styles.input, paddingRight: spacing.sm}} />
                </div>
                <div style={{ transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' }, marginBottom: '2px' }}>
                <ExcelExportButtons tipo="formato-empresa" filters={filtros} buttonText="Exportar Reporte" buttonStyle={styles.reportButton} />
                </div>
            </div>
            </div>

            <div style={{...styles.tableContainer, opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s'}}>
            {registros.length > 0 ? (
                <table style={styles.table}>
                <thead>
                    <tr>
                    <th style={styles.th}>Fecha</th>
                    <th style={styles.th}>Hora</th>
                    <th style={styles.th}>Turno</th>
                    <th style={styles.th}>Área</th>
                    <th style={styles.th}>Máquina</th>
                    {/* Renderizado dinámico de encabezados basado en materiales activos */}
                    {materialesColumns.map(mat => (
                        <th key={mat.id} style={{...styles.th, ...styles.dynamicHeader}}>
                            <span style={styles.materialHeaderName}>
                                {mat.tipo_nombre.length > 10 
                                    ? mat.tipo_nombre.substring(0, 8) + '...'
                                    : mat.tipo_nombre}
                            </span>
                            <span style={styles.materialHeaderUnit}>(kg)</span>
                        </th>
                    ))}
                    <th style={styles.th}>Total (kg)</th>
                    <th style={styles.th}>Método</th>
                    </tr>
                </thead>
                <tbody>
                    {registros.map((r, index) => (
                        <tr key={r.id} style={{ ...styles.tr, ...(r.conexion_bascula ? styles.basculaRow : styles.manualRow), animationDelay: `${index * 0.03}s` }} className="table-row-anim" onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.98)'} onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}>
                            <td style={styles.td}>{new Date(r.fecha_registro).toLocaleDateString('es-ES')}</td>
                            <td style={styles.td}>{new Date(r.fecha_registro).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td style={styles.td}><span style={styles.turnoBadge}>T{r.turno}</span></td>
                            <td style={styles.td}><span style={styles.areaTag}>{r.area_real}</span></td>
                            <td style={styles.td}><strong>{r.maquina_real}</strong></td>
                            
                            {/* Celdas dinámicas de materiales */}
                            {materialesColumns.map(mat => {
                                const peso = extraerPesoDeRegistro(r, mat);
                                const tienePeso = peso > 0;
                                
                                return (
                                    <td key={mat.id} style={{
                                        ...styles.td, 
                                        ...styles.numericCell,
                                        color: tienePeso ? colors.gray900 : colors.gray400,
                                        backgroundColor: tienePeso ? colors.secondaryLight + '10' : 'transparent',
                                        fontWeight: tienePeso ? typography.weights.medium : typography.weights.normal
                                    }}
                                    title={tienePeso ? `${mat.tipo_nombre}: ${peso.toFixed(2)} kg` : `${mat.tipo_nombre}: Sin datos`}
                                    >
                                        {tienePeso ? peso.toFixed(2) : '-'}
                                    </td>
                                );
                            })}

                            <td style={{ ...styles.td, ...styles.totalCell }}>
                                <strong><AnimatedCounter value={r.peso_total} duration={500} decimals={2} /></strong>
                            </td>
                            <td style={styles.td}>
                                {r.conexion_bascula ? 
                                    <span style={styles.badgeSuccess}>BÁSCULA</span> : 
                                    <span style={styles.badgeWarn}>MANUAL</span>
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
                </table>
            ) : (
                <div style={styles.emptyState}>
                <div style={{marginBottom: '10px'}}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{color: colors.gray300}}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </div>
                <h3 style={styles.emptyStateText}>No hay registros</h3>
                <p style={styles.emptyStateSubtext}>No se encontraron registros con los filtros seleccionados</p>
                </div>
            )}
            </div>

            {registros.length > 0 && (
            <CardTransition delay={200} style={styles.resumenContainer}>
                <div style={styles.resumenItem}>
                    <span style={styles.resumenLabel}>Total de registros:</span>
                    <span style={styles.resumenValue}>
                        <AnimatedCounter value={registros.length} decimals={0} />
                    </span>
                </div>
                <div style={styles.resumenItem}>
                    <span style={styles.resumenLabel}>Peso total filtrado:</span>
                    <span style={styles.resumenValue}>
                        <AnimatedCounter value={registros.reduce((total, r) => total + (parseFloat(r.peso_total) || 0), 0)} /> kg
                    </span>
                </div>
                <div style={styles.resumenItem}>
                    <span style={styles.resumenLabel}>Registros con báscula:</span>
                    <span style={styles.resumenValue}>
                        <AnimatedCounter value={registros.filter(r => r.conexion_bascula).length} decimals={0} />
                    </span>
                </div>
                <div style={styles.resumenItem}>
                    <span style={styles.resumenLabel}>Registros Manuales:</span>
                    <span style={styles.resumenValue}>
                        <AnimatedCounter value={registros.filter(r => !r.conexion_bascula).length} decimals={0} />
                    </span>
                </div>
            </CardTransition>
            )}
        </CardTransition>
      </PageWrapper>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Registro Completo de Scrap</h3>
                <p style={styles.modalSubtitle}>Complete los datos de producción para todas las máquinas</p>
              </div>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn} aria-label="Cerrar modal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={styles.modalContent}>
              {modalLoading && (
                <div style={styles.modalLoading}>
                  <LoadingSpinner message="Cargando configuración de máquinas..." />
                </div>
              )}
              <RegistroScrapCompleto onRegistroCreado={handleRegistroCreado} onCancelar={() => setShowModal(false)} onLoadComplete={handleModalLoaded} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperadorDashboard;