/* src/pages/OperadorDashboard.js */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// ✅ COMPONENTE ANIMATED COUNTER MEJORADO (Estilo Receptor)
const AnimatedCounter = ({ value, duration = 1000, decimals = 2 }) => {
  const [count, setCount] = useState(0);
  const previousValue = useRef(0); // Guardamos el valor previo para transiciones suaves

  useEffect(() => {
    let startTime;
    let animationFrame;
    const start = previousValue.current; // Inicia desde el último valor, no desde 0
    const end = parseFloat(value) || 0;
    
    if (start === end) {
        setCount(end);
        return;
    }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing function: easeOutExpo
      const easeOut = 1 - Math.pow(2, -10 * progress);
      
      const current = start + (end - start) * easeOut;
      setCount(current);
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCount(end);
        previousValue.current = end; // Actualizamos la referencia al terminar
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
  
  // Modales
  const [showModal, setShowModal] = useState(false); 
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Estado para animaciones de tabla
  const [triggerTableAnimation, setTriggerTableAnimation] = useState(false);

  // Estado para correo y PREVIEW
  const [emailDestino, setEmailDestino] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [vistaPreviaData, setVistaPreviaData] = useState(null); 
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false); 

  // Config
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.keyCode === 27 || event.key === 'Escape') {
        setShowModal(false);
        if (!enviandoCorreo) {
            setShowEmailModal(false);
            setVistaPreviaData(null); 
            setVistaPrevia(false);
        }
      }
    };

    if (showModal || showEmailModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscKey);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => { 
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showModal, showEmailModal, enviandoCorreo]);

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
    setTriggerTableAnimation(false); // Reiniciar animación
    
    try {
      const [registrosData, configData] = await Promise.all([
        apiClient.getRegistrosScrap(filtros),
        apiClient.getRegistrosConfig()
      ]);
      setRegistros(Array.isArray(registrosData) ? registrosData : []);
      setConfig(configData);
      
      setTimeout(() => setTriggerTableAnimation(true), 100);

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

  // --- LÓGICA DE CORREO Y PREVIEW ---
  const handleOpenEmailModal = () => {
      setEmailDestino(''); 
      setVistaPreviaData(null);
      setVistaPrevia(false);
      setShowEmailModal(true);
  };

  const handlePreviewEmail = async (e) => {
      e.preventDefault();
      if (!emailDestino) {
          addToast('Por favor ingrese un correo destinatario', 'warning');
          return;
      }
      
      setCargandoPreview(true);
      try {
          const data = await apiClient.getPreviewReporte({
              fecha: filtros.fecha,
              turno: filtros.turno
          });
          setVistaPreviaData(data);
          setVistaPrevia(true); 
      } catch (error) {
          if (error.message.includes('404')) {
              addToast('No hay datos registrados para generar el reporte.', 'warning');
          } else {
              addToast('Error al generar vista previa: ' + error.message, 'error');
          }
      } finally {
          setCargandoPreview(false);
      }
  };

  const handleSendEmail = async () => {
      setEnviandoCorreo(true);
      try {
          await apiClient.enviarReporteCorreo({
              email_destino: emailDestino,
              fecha: filtros.fecha,
              turno: filtros.turno
          });
          
          addToast(`Reporte enviado exitosamente a ${emailDestino}`, 'success');
          setShowEmailModal(false);
          setVistaPreviaData(null);
          setVistaPrevia(false);
      } catch (error) {
          addToast('Error al enviar correo: ' + error.message, 'error');
      } finally {
          setEnviandoCorreo(false);
      }
  };

  // ... (Styles) ...
  const styles = {
    // ... (Estilos previos container, header, etc.) ...
    container: { backgroundColor: colors.background, fontFamily: typography.fontFamily, boxSizing: 'border-box', width: '100%', height: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.md },
    headerActions: { display: 'flex', gap: spacing.md, alignItems: 'center' },
    title: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.extrabold, color: colors.gray900, margin: 0, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    subtitle: { color: colors.gray600, fontSize: typography.sizes.lg, margin: `${spacing.xs} 0 0 0`, fontWeight: typography.weights.medium },
    loadingPage: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh', backgroundColor: colors.background, flexDirection: 'column' },
    modalLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, borderRadius: radius.lg },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: spacing.md, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease-out' },
    modal: { backgroundColor: colors.surface, borderRadius: radius.xl, width: '98%', maxWidth: '1400px', maxHeight: '90vh', height: 'auto', overflow: 'hidden', boxShadow: shadows.xl, border: `1px solid ${colors.gray200}`, display: 'flex', flexDirection: 'column', position: 'relative', animation: 'slideInUp 0.3s ease-out', boxSizing: 'border-box', margin: 'auto' },
    
    modalMedium: { backgroundColor: colors.surface, borderRadius: radius.lg, width: '100%', maxWidth: '900px', maxHeight: '90vh', padding: 0, boxShadow: shadows.xl, border: `1px solid ${colors.gray200}`, animation: 'slideInUp 0.3s ease-out', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'max-width 0.3s ease' },
    modalSmall: { backgroundColor: colors.surface, borderRadius: radius.lg, width: '100%', maxWidth: '420px', maxHeight: '90vh', padding: 0, boxShadow: shadows.xl, border: `1px solid ${colors.gray200}`, animation: 'slideInUp 0.3s ease-out', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'max-width 0.3s ease' },
    
    modalHeader: { padding: spacing.lg, borderBottom: `1px solid ${colors.gray200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: colors.gray50, flexShrink: 0 },
    modalTitle: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.semibold, color: colors.gray900, margin: 0, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    modalSubtitle: { fontSize: typography.sizes.lg, color: colors.gray600, margin: `${spacing.xs} 0 0 0` },
    modalContent: { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 0, position: 'relative', paddingBottom: '20px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: colors.gray500, padding: spacing.xs, borderRadius: radius.sm, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', ':hover': { backgroundColor: colors.gray200, color: colors.gray700 } },
    card: { ...baseComponents.card, overflow: 'hidden', marginBottom: spacing.lg },
    cardHeader: { padding: spacing.md, borderBottom: `1px solid ${colors.gray200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, backgroundColor: colors.gray50 },
    cardTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, color: colors.gray800, margin: 0, display: 'flex', alignItems: 'center', gap: spacing.xs },
    miniLoader: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.medium, marginLeft: spacing.md, animation: 'pulse 1.5s infinite' },
    filters: { display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' },
    filterGroup: { display: 'flex', flexDirection: 'column', gap: spacing.xs },
    filterLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.gray600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    select: { ...baseComponents.select, padding: `0 ${spacing.sm}`, height: '36px', minWidth: '120px', maxWidth: '140px', boxSizing: 'border-box', fontSize: typography.sizes.sm, lineHeight: '36px', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right ${spacing.xs} center`, backgroundRepeat: 'no-repeat', backgroundSize: '14px 14px', paddingRight: '32px' },
    input: { ...baseComponents.input, padding: `0 ${spacing.sm}`, height: '36px', minWidth: '120px', maxWidth: '140px', boxSizing: 'border-box', fontSize: typography.sizes.sm, lineHeight: '36px' },
    reportButton: { ...baseComponents.buttonPrimary, display: 'inline-flex', alignItems: 'center', gap: spacing.xs, padding: `${spacing.sm} ${spacing.md}`, height: '36px', fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, backgroundColor: colors.success, border: `1px solid ${colors.success}` },
    emailButton: { ...baseComponents.buttonSecondary, display: 'inline-flex', alignItems: 'center', gap: spacing.xs, padding: `${spacing.sm} ${spacing.md}`, height: '36px', fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, backgroundColor: colors.info, color: '#fff', border: `1px solid ${colors.info}`, ':hover': { backgroundColor: '#2563EB' } },
    primaryButton: { ...baseComponents.buttonPrimary, display: 'inline-flex', alignItems: 'center', gap: spacing.xs, padding: `${spacing.sm} ${spacing.lg}`, height: '42px' },
    tableContainer: { overflowX: 'auto', maxHeight: '600px' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '1000px' },
    th: { padding: spacing.md, textAlign: 'left', fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.gray600, textTransform: 'uppercase', backgroundColor: colors.gray50, borderBottom: `2px solid ${colors.gray200}`, position: 'sticky', top: 0, zIndex: 10, letterSpacing: '0.05em', whiteSpace: 'nowrap' },
    
    // ESTILO DE FILA CON ANIMACIÓN Y COLORES RESTAURADOS
    tr: (index) => ({ 
        borderBottom: `1px solid ${colors.gray200}`, 
        transition: 'all 0.3s ease',
        // NO definimos backgroundColor aquí para no sobrescribir basculaRow/manualRow
        opacity: triggerTableAnimation ? 1 : 0,
        transform: triggerTableAnimation ? 'translateY(0)' : 'translateY(10px)',
        transitionDelay: `${index * 0.03}s` 
    }),
    
    basculaRow: { backgroundColor: '#EFF6FF', borderLeft: `4px solid ${colors.primary}` },
    manualRow: { backgroundColor: '#FFFBEB', borderLeft: `4px solid ${colors.warning}` },
    
    td: { padding: spacing.md, fontSize: typography.sizes.sm, color: colors.gray700, borderBottom: `1px solid ${colors.gray200}`, whiteSpace: 'nowrap' },
    numericCell: { textAlign: 'right', fontFamily: typography.fontMono, fontWeight: typography.weights.medium },
    totalCell: { textAlign: 'right', fontFamily: typography.fontMono, fontWeight: typography.weights.bold, color: colors.success },
    turnoBadge: { ...baseComponents.badge, backgroundColor: colors.gray200, color: colors.gray700 },
    areaTag: { ...baseComponents.badge, backgroundColor: colors.primaryLight, color: colors.primary, textTransform: 'uppercase' },
    badgeSuccess: { ...baseComponents.badge, backgroundColor: colors.secondaryLight, color: colors.secondary, gap: spacing.xs },
    badgeWarn: { ...baseComponents.badge, backgroundColor: colors.warning + '20', color: colors.warning, gap: spacing.xs },
    
    // ESTILOS MEJORADOS PARA EL RESUMEN (TARJETAS COMPACTAS)
    resumenContainer: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', // Más compacto
        gap: spacing.md, 
        marginTop: 0, 
        marginBottom: spacing.lg 
    },
    resumenItem: (color) => ({ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '4px', // Gap reducido
        textAlign: 'center',
        padding: spacing.md, // Padding reducido
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        boxShadow: shadows.sm,
        borderTop: `4px solid ${color}`,
        border: `1px solid ${colors.gray200}`,
        borderTopWidth: '4px',
        borderTopColor: color,
        transition: 'transform 0.2s ease',
        ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: shadows.md
        }
    }),
    resumenLabel: { 
        fontSize: '0.65rem', // Fuente más pequeña
        color: colors.gray500, 
        fontWeight: typography.weights.bold, 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        marginTop: '2px'
    },
    resumenValue: (color) => ({ 
        fontSize: '1.25rem', // Fuente del número reducida
        color: color, 
        fontWeight: typography.weights.extrabold,
        lineHeight: 1.1
    }),
    iconCircle: (color) => ({
        width: '32px', // Ícono más pequeño
        height: '32px', 
        borderRadius: '50%', 
        backgroundColor: color + '15', 
        color: color, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '2px'
    }),

    emptyState: { padding: spacing.xl, textAlign: 'center', color: colors.gray500 },
    emptyStateText: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginBottom: spacing.xs, color: colors.gray700 },
    emptyStateSubtext: { fontSize: typography.sizes.base, opacity: 0.7, marginBottom: spacing.lg },
    dynamicHeader: { minWidth: '90px', textAlign: 'center', padding: '8px', fontSize: '0.7rem' },
    materialCell: { fontSize: typography.sizes.xs, color: colors.gray600, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    
    // ... (Resto de estilos de previewTable, etc.) ...
    previewTableWrapper: { overflowX: 'auto', maxHeight: '400px', border: `1px solid ${colors.gray200}`, borderRadius: radius.md, marginBottom: spacing.lg },
    previewTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
    previewTh: { padding: spacing.sm, backgroundColor: colors.primary, color: '#fff', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap', border: `1px solid ${colors.primaryHover}` },
    previewTd: { padding: spacing.sm, border: `1px solid ${colors.gray200}`, textAlign: 'right' },
    previewTdText: { padding: spacing.sm, border: `1px solid ${colors.gray200}`, textAlign: 'left' },
    previewTotalRow: { backgroundColor: colors.gray100, fontWeight: 'bold' }
  };

  // ... (Resto de la lógica) ...
  // Cálculos para stats dinámicos (Animados)
  const totalRegistros = registros.length;
  const numFilasConPeso = registros.filter(r => parseFloat(r.peso_total) > 0).length;
  const totalKg = registros.reduce((total, r) => total + (parseFloat(r.peso_total) || 0), 0);
  const conBascula = registros.filter(r => r.conexion_bascula).length;
  const manuales = registros.filter(r => !r.conexion_bascula).length;

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <LoadingSpinner message="Cargando dashboard..." />
      </div>
    );
  }

  // Modal para correo (CON VISTA PREVIA Y EMOJIS REEMPLAZADOS)
  const emailModal = showEmailModal ? (
      <div style={styles.modalOverlay} onClick={() => !enviandoCorreo && setShowEmailModal(false)}>
          <div style={vistaPrevia ? styles.modalMedium : styles.modalSmall} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                    <h3 style={{...styles.cardTitle, margin: 0, fontSize: '1.25rem'}}>Enviar Reporte</h3>
                    <p style={{fontSize: typography.sizes.xs, color: colors.gray600, margin: '4px 0 0 0'}}>
                        {filtros.fecha} - Turno {filtros.turno}
                    </p>
                </div>
                <button onClick={() => setShowEmailModal(false)} style={styles.closeBtn} disabled={enviandoCorreo}>✕</button>
              </div>
              
              <div style={{...styles.modalContent, padding: spacing.lg}}>
                {!vistaPreviaData ? (
                    <form onSubmit={handlePreviewEmail} style={{display: 'flex', flexDirection: 'column', gap: spacing.lg}}>
                        <div style={{textAlign: 'center', padding: spacing.lg, backgroundColor: colors.gray50, borderRadius: radius.md}}>
                            <div style={{marginBottom: spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: colors.gray700}}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                                <span>Se enviará el archivo Excel adjunto a:</span>
                            </div>
                            <SmoothInput 
                                label="Correo Destinatario" 
                                type="email" 
                                value={emailDestino} 
                                onChange={(e) => setEmailDestino(e.target.value)} 
                                placeholder="jefe.planta@coficab.com" 
                                required
                                autoFocus
                                style={{textAlign: 'center'}}
                            />
                        </div>
                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: spacing.md}}>
                            <SmoothButton type="button" onClick={() => setShowEmailModal(false)} variant="secondary">Cancelar</SmoothButton>
                            <SmoothButton type="submit" disabled={cargandoPreview}>
                                {cargandoPreview ? 'Cargando...' : 'Vista Previa'}
                            </SmoothButton>
                        </div>
                    </form>
                ) : (
                    <div style={{animation: 'fadeIn 0.3s ease'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md}}>
                            <h4 style={{margin: 0, color: colors.gray800}}>Vista Previa del Contenido</h4>
                            <div style={{fontSize: '0.8rem', color: colors.gray500}}>
                                Para: <strong>{emailDestino}</strong>
                            </div>
                        </div>

                        <div style={styles.previewTableWrapper}>
                            <table style={styles.previewTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.previewTh}>Área</th>
                                        <th style={styles.previewTh}>Máquina</th>
                                        {vistaPreviaData.headers.map(h => (
                                            <th key={h.id} style={styles.previewTh}>{h.tipo_nombre}</th>
                                        ))}
                                        <th style={styles.previewTh}>TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vistaPreviaData.rows.map((row, i) => (
                                        <tr key={i}>
                                            <td style={styles.previewTdText}>{row.area}</td>
                                            <td style={styles.previewTdText}>{row.maquina}</td>
                                            {vistaPreviaData.headers.map(h => (
                                                <td key={h.id} style={styles.previewTd}>
                                                    {/* ✅ ANIMACIÓN APLICADA A CELDAS INDIVIDUALES */}
                                                    {row.valores[h.id] > 0 
                                                        ? <AnimatedCounter value={row.valores[h.id]} duration={500} decimals={2} />
                                                        : '-'}
                                                </td>
                                            ))}
                                            <td style={{...styles.previewTd, fontWeight: 'bold'}}>{row.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    <tr style={styles.previewTotalRow}>
                                        <td colSpan={2} style={{...styles.previewTd, textAlign: 'center'}}>TOTALES</td>
                                        {vistaPreviaData.headers.map(h => (
                                            <td key={h.id} style={styles.previewTd}>
                                                {/* ✅ ANIMACIÓN APLICADA A TOTALES POR MATERIAL */}
                                                {vistaPreviaData.totales[h.id] > 0 
                                                    ? <AnimatedCounter value={vistaPreviaData.totales[h.id]} duration={500} decimals={2} />
                                                    : '-'}
                                            </td>
                                        ))}
                                        <td style={styles.previewTd}>{vistaPreviaData.granTotal.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div style={{display: 'flex', gap: spacing.md, justifyContent: 'flex-end', borderTop: `1px solid ${colors.gray200}`, paddingTop: spacing.md}}>
                            <SmoothButton type="button" onClick={() => setVistaPreviaData(null)} variant="secondary" disabled={enviandoCorreo}>Editar Correo</SmoothButton>
                            <SmoothButton onClick={handleSendEmail} disabled={enviandoCorreo} style={{backgroundColor: colors.success, border: 'none', color: '#fff', minWidth: '160px', justifyContent: 'center'}}>
                                {enviandoCorreo ? (
                                    <>
                                        <span style={{animation: 'spin 1s linear infinite', marginRight: '6px', display: 'inline-flex', alignItems: 'center'}}>
                                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                        </span> 
                                        Enviando...
                                    </>
                                ) : (
                                    <>Confirmar y Enviar</>
                                )}
                            </SmoothButton>
                        </div>
                    </div>
                )}
              </div>
          </div>
      </div>
  ) : null;

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

        {/* ✅ RESUMEN CON TARJETAS MÁS PEQUEÑAS ✅ */}
        {registros.length > 0 && (
        <CardTransition delay={100} style={styles.resumenContainer}>
            <div style={styles.resumenItem(colors.primary)}>
                <div style={styles.iconCircle(colors.primary)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <span style={styles.resumenValue(colors.primary)}><AnimatedCounter value={totalRegistros} decimals={0} /></span>
                <span style={styles.resumenLabel}>Registros</span>
            </div>
            
            <div style={styles.resumenItem(colors.info)}>
                    <div style={styles.iconCircle(colors.info)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                </div>
                <span style={styles.resumenValue(colors.info)}><AnimatedCounter value={totalKg} decimals={2} /> <span style={{fontSize:'0.9rem'}}>kg</span></span>
                <span style={styles.resumenLabel}>Peso Total</span>
            </div>

            <div style={styles.resumenItem(colors.success)}>
                <div style={styles.iconCircle(colors.success)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                </div>
                <span style={styles.resumenValue(colors.success)}><AnimatedCounter value={conBascula} decimals={0} /></span>
                <span style={styles.resumenLabel}>Automáticos</span>
            </div>

            <div style={styles.resumenItem(colors.warning)}>
                <div style={styles.iconCircle(colors.warning)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </div>
                <span style={styles.resumenValue(colors.warning)}><AnimatedCounter value={manuales} decimals={0} /></span>
                <span style={styles.resumenLabel}>Manuales</span>
            </div>
        </CardTransition>
        )}

        <CardTransition delay={200} style={styles.card}>
            {/* ... Resto del componente ... */}
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
                
                {/* Botones de acción */}
                <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end', marginBottom: '2px' }}>
                    <div style={{ transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } }}>
                        <ExcelExportButtons tipo="formato-empresa" filters={filtros} buttonText="Descargar" buttonStyle={styles.reportButton} />
                    </div>
                    <div style={{ transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } }}>
                        <SmoothButton onClick={handleOpenEmailModal} style={styles.emailButton} title="Enviar reporte por correo">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            Enviar Correo
                        </SmoothButton>
                    </div>
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
                    {config?.tipos_scrap && Array.isArray(config.tipos_scrap) ? config.tipos_scrap.sort((a,b) => a.orden - b.orden).map(mat => (
                         <th key={mat.id} style={{...styles.th, ...styles.dynamicHeader}}>
                            {mat.tipo_nombre.split(' ').map(w => w.substring(0, 3)).join('.')} 
                         </th>
                    )) : null}
                    <th style={styles.th}>Total (kg)</th>
                    <th style={styles.th}>Método</th>
                    </tr>
                </thead>
                <tbody>
                    {registros.map((r, index) => (
                        <tr key={r.id} style={{ ...styles.tr(index), ...(r.conexion_bascula ? styles.basculaRow : styles.manualRow) }} className="table-row-anim" onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.98)'} onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}>
                            <td style={styles.td}>{new Date(r.fecha_registro).toLocaleDateString('es-ES')}</td>
                            <td style={styles.td}>{new Date(r.fecha_registro).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td style={styles.td}><span style={styles.turnoBadge}>T{r.turno}</span></td>
                            <td style={styles.td}><span style={styles.areaTag}>{r.area_real}</span></td>
                            <td style={styles.td}><strong>{r.maquina_real}</strong></td>
                            
                            {/* ✅ Celdas dinámicas de materiales con ANIMACIÓN */}
                            {config?.tipos_scrap && Array.isArray(config.tipos_scrap) ? config.tipos_scrap.sort((a,b) => a.orden - b.orden).map(mat => {
                                const detalle = r.materiales_resumen 
                                    ? r.materiales_resumen.find(d => d.nombre === mat.tipo_nombre) 
                                    : null;
                                const peso = detalle ? parseFloat(detalle.peso) : 0;
                                
                                return (
                                    <td key={mat.id} style={{...styles.td, ...styles.numericCell, color: peso > 0 ? colors.gray900 : colors.gray400}}>
                                        {peso > 0 ? <AnimatedCounter value={peso} duration={500} decimals={2} /> : '-'}
                                    </td>
                                );
                            }) : null}

                            <td style={{ ...styles.td, ...styles.totalCell }}><strong><AnimatedCounter value={r.peso_total} duration={500} decimals={2} /></strong></td>
                            <td style={styles.td}>{r.conexion_bascula ? <span style={styles.badgeSuccess}>BÁSCULA</span> : <span style={styles.badgeWarn}>MANUAL</span>}</td>
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
        </CardTransition>
      </PageWrapper>

      {/* Modal Registro */}
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

      {/* Modal Correo */}
      {emailModal && createPortal(emailModal, document.body)}
    </div>
  );
};

export default OperadorDashboard;