/* src/pages/ReceptorDashboard.js */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import BasculaConnection from '../components/BasculaConnection';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import SmoothButton from '../components/SmoothButton';
import SmoothInput from '../components/SmoothInput';
import SmoothSelect from '../components/SmoothSelect';
import LoadingSpinner from '../components/LoadingSpinner';
import CardTransition from '../components/CardTransition';
import PageWrapper from '../components/PageWrapper';
import TabsAnimated from '../components/TabsAnimated';
import ExcelExportButtons from '../components/ExcelExportButtons';

const getImageDataUrl = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const AnimatedCounter = ({ value, duration = 1000, decimals = 2 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = 0;
    const endValue = parseFloat(value) || 0;
    if (endValue === 0) { setCount(0); return; }
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(2, -10 * progress);
      setCount(easeOut * (endValue - startValue) + startValue);
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
      else setCount(endValue);
    };
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  return <span>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

const ReceptorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listaMateriales, setListaMateriales] = useState([]);
  const loadedRef = useRef(false);
  const [selectedClasif, setSelectedClasif] = useState(null);
  const [filterHU, setFilterHU] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pesoBloqueado, setPesoBloqueado] = useState(false);
  const [formData, setFormData] = useState({
    peso_kg: '',
    tipo_scrap_id: '',
    tipo_material: '',
    origen_tipo: 'externa',
    origen_especifico: '',
    destino: 'almacenamiento',
    lugar_almacenamiento: '',
    observaciones: ''
  });

  const [reporteFechas, setReporteFechas] = useState({
    inicio: new Date().toISOString().slice(0, 10),
    fin: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    const handleEscKey = (event) => { if (event.key === 'Escape') setShowModal(false); };
    if (showModal) {
      setPesoBloqueado(false);
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

  const loadReceptorData = useCallback(async () => {
    try {
      const [recepcionesData, materialesData] = await Promise.all([
        apiClient.getRecepcionesScrap(),
        apiClient.getMaterialesPorUso('receptor')
      ]);
      setRecepciones(recepcionesData);
      setListaMateriales(Array.isArray(materialesData) ? materialesData : []);
    } catch (error) {
      addToast('Error al cargar datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadReceptorData();
  }, [loadReceptorData]);


  const recepcionesVisualizadas = useMemo(() => {
    if (!reporteFechas.inicio || !reporteFechas.fin) return recepciones;
    return recepciones.filter(r => {
      const fechaEntrada = new Date(r.fecha_entrada).toISOString().split('T')[0];
      return fechaEntrada >= reporteFechas.inicio && fechaEntrada <= reporteFechas.fin;
    });
  }, [recepciones, reporteFechas]);

  const statsClasificacion = useMemo(() => {
    const stats = {
      almacenamiento: { peso: 0, count: 0, label: 'Almacenamiento', color: colors.primary },
      reciclaje: { peso: 0, count: 0, label: 'Directo a Reciclaje', color: colors.success },
      venta: { peso: 0, count: 0, label: 'Venta Directa', color: colors.warning }
    };
    recepcionesVisualizadas.forEach(r => {
      let key = 'almacenamiento';
      const d = r.destino?.toLowerCase() || '';
      if (d.includes('reciclaje')) key = 'reciclaje';
      else if (d.includes('venta')) key = 'venta';
      stats[key].peso += parseFloat(r.peso_kg) || 0;
      stats[key].count += 1;
    });
    return stats;
  }, [recepcionesVisualizadas]);

  const recepcionesFiltradas = useMemo(() => {
    return recepciones.filter(item => {
      const matchHU = filterHU ? item.numero_hu.toLowerCase().includes(filterHU.toLowerCase()) : true;
      let matchDate = true;
      if (filterDate) {
        const itemDate = new Date(item.fecha_entrada).toISOString().split('T')[0];
        matchDate = itemDate === filterDate;
      }
      return matchHU && matchDate;
    });
  }, [recepciones, filterHU, filterDate]);

  const materialesDetalle = useMemo(() => {
    if (!selectedClasif) return [];
    return recepcionesVisualizadas.filter(r => {
      const d = r.destino?.toLowerCase() || '';
      if (selectedClasif === 'reciclaje') return d.includes('reciclaje');
      if (selectedClasif === 'venta') return d.includes('venta');
      return !d.includes('reciclaje') && !d.includes('venta');
    }).sort((a, b) => new Date(b.fecha_entrada) - new Date(a.fecha_entrada));
  }, [recepcionesVisualizadas, selectedClasif]);

  const handleImprimirHU = async (id) => {
  try {
    const recepcion = recepciones.find((r) => r.id === id);
    if (!recepcion) throw new Error("Recepción no encontrada");

    let logoData = null;
    try {
      logoData = await getImageDataUrl('/Logo-COFICAB.png');
    } catch (e) {
      console.warn("No se pudo cargar el logo, se usará texto.");
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [139.7, 215.9], 
    });

    const sheetWidth = 215.9;
    const sheetHeight = 139.7;
    
    const labelWidth = sheetWidth * 0.4; 
    const labelHeight = 65; 
    
    const offsetX = (sheetWidth - labelWidth) / 2;
    const offsetY = 2; 

    const margin = 4;
    const contentWidth = labelWidth - margin * 2;
    
    doc.setLineWidth(0.6);
    doc.setDrawColor(0);
    doc.roundedRect(offsetX + margin, offsetY + margin, contentWidth, labelHeight - margin * 2, 3, 3);

    const headerLineY = offsetY + 15;
    doc.line(offsetX + margin, headerLineY, offsetX + labelWidth - margin, headerLineY);

    if (logoData) {
      doc.addImage(logoData, 'PNG', offsetX + margin + 2, offsetY + margin + 1, 25, 8);
    }

    doc.setFontSize(7);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEPCIÓN SCRAP', offsetX + labelWidth - margin - 4, offsetY + 8, { align: 'right' });

    doc.setFontSize(6);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    const fechaTexto = new Date(recepcion.fecha_entrada).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).toUpperCase();
    doc.text(fechaTexto, offsetX + labelWidth - margin - 4, offsetY + 13, { align: 'right' });

    const boxTop = headerLineY;
    const boxHeight = 12;
    doc.setFillColor(242, 242, 242);
    doc.rect(offsetX + margin + 0.4, boxTop, contentWidth - 0.8, boxHeight, 'F');
    doc.line(offsetX + margin, boxTop + boxHeight, offsetX + labelWidth - margin, boxTop + boxHeight);

    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const materialFull = recepcion.tipo_material.toUpperCase();
    let fSize = 16; 
    doc.setFontSize(fSize);
    while (doc.getTextWidth(materialFull) > contentWidth - 6 && fSize > 8) {
      fSize -= 1;
      doc.setFontSize(fSize);
    }
    doc.text(materialFull, offsetX + margin + (contentWidth / 2), boxTop + (boxHeight / 2) + (fSize * 0.35) / 2.5, { align: 'center' });

    const middleY = boxTop + boxHeight;
    const footerLineY = offsetY + labelHeight - 10;
    doc.line(offsetX + margin + (contentWidth / 2), middleY, offsetX + margin + (contentWidth / 2), footerLineY);

    const colLeftCenter = offsetX + margin + (contentWidth * 0.25);
    const barcodeWidth = 32;
    const barcodeHeight = 12;
    const canvasBc = document.createElement('canvas');
    JsBarcode(canvasBc, recepcion.numero_hu, {
      format: 'CODE128', displayValue: true, fontSize: 12, height: 30, width: 2, margin: 0
    });
    doc.addImage(canvasBc.toDataURL('image/jpeg'), 'JPEG', colLeftCenter - (barcodeWidth / 2), middleY + 2, barcodeWidth, barcodeHeight);

    const qrSize = 12;
    try {
      const QRCode = await import('qrcode').then(module => module.default);
      const qrDataUrl = await QRCode.toDataURL(recepcion.numero_hu, { margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', colLeftCenter - (qrSize / 2), middleY + 15, qrSize, qrSize);
    } catch (e) { console.warn(e); }

    const colRightCenter = offsetX + margin + (contentWidth * 0.75);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`HU: ${recepcion.numero_hu}`, colRightCenter, middleY + 6, { align: 'center' });

    const bwWidth = 32;
    const bwHeight = 16;
    doc.setLineWidth(0.5);
    doc.roundedRect(colRightCenter - (bwWidth / 2), middleY + 8, bwWidth, bwHeight, 2, 2);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('PESO NETO (KG)', colRightCenter, middleY + 12, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(parseFloat(recepcion.peso_kg).toFixed(2), colRightCenter, middleY + 21, { align: 'center' });

    doc.setLineWidth(0.4);
    doc.line(offsetX + margin, footerLineY, offsetX + labelWidth - margin, footerLineY);

    const footerTextY = footerLineY + 3.5;
    doc.setFontSize(6);
    
    doc.setTextColor(100);
    doc.text('ORIGEN:', offsetX + margin + 2, footerTextY);
    doc.setTextColor(0);
    const origenLabel = (recepcion.origen_tipo === 'interna' ? 'PLANTA INTERNA' : (recepcion.origen_especifico || 'EXTERIOR')).toUpperCase();
    doc.text(origenLabel, offsetX + margin + 12, footerTextY);

    doc.setTextColor(100);
    doc.text('DESTINO:', offsetX + margin + (contentWidth / 2) + 2, footerTextY);
    doc.setTextColor(0);
    const destinoLabel = (recepcion.destino || 'ALMACÉN').toUpperCase();
    doc.text(destinoLabel.substring(0, 12), offsetX + margin + (contentWidth / 2) + 13, footerTextY);

    doc.setFontSize(4);
    doc.setTextColor(150);
    doc.text('Sistema Scrap - COFICAB', offsetX + margin + (contentWidth / 2), offsetY + labelHeight - 2, { align: 'center' });

    doc.save(`HU_${recepcion.numero_hu}.pdf`);
    addToast('Etiqueta generada correctamente', 'success');
  } catch (error) {
    addToast('Error: ' + error.message, 'error');
  }
};

  const handleUpdateDestino = async (id, nuevoDestino) => {
    const previousState = [...recepciones];
    setRecepciones(prev => prev.map(r => r.id === id ? { ...r, destino: nuevoDestino } : r));
    try {
      await apiClient.updateRecepcionScrap(id, { destino: nuevoDestino });
      addToast(`Destino actualizado`, 'success');
    } catch (error) {
      setRecepciones(previousState);
      addToast('Error al actualizar: ' + error.message, 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'peso_kg' && pesoBloqueado) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrigenTipoChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value, origen_especifico: '' });
  };

  const handlePesoFromBascula = useCallback((peso, campo) => {
    if (!pesoBloqueado) {
      setFormData(prev => (prev[campo] === peso ? prev : { ...prev, [campo]: peso }));
    }
  }, [pesoBloqueado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const response = await apiClient.createRecepcionScrap(formData);
      addToast(`Recepción exitosa HU: ${response.numero_hu}`, 'success');
      setShowModal(false);
      setFormData({ peso_kg: '', tipo_material: '', origen_tipo: 'externa', origen_especifico: '', destino: 'almacenamiento', lugar_almacenamiento: '', observaciones: '' });
      loadReceptorData();
    } catch (error) {
      addToast('Error: ' + error.message, 'error');
    } finally { setEnviando(false); }
  };

  const styles = {
    container: { backgroundColor: colors.background, fontFamily: typography.fontFamily, boxSizing: 'border-box', width: '100%', height: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, flexWrap: 'wrap', gap: spacing.md },
    title: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.extrabold, color: colors.gray900, margin: 0, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    subtitle: { color: colors.gray600, fontSize: typography.sizes.lg, margin: 0, fontWeight: typography.weights.medium },
    toolbar: { display: 'flex', gap: spacing.md, alignItems: 'flex-end', padding: spacing.md, backgroundColor: colors.gray50, borderRadius: radius.lg, border: `1px solid ${colors.gray200}`, marginBottom: spacing.md, flexWrap: 'wrap' },
    loadingPage: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh', backgroundColor: colors.background },
    card: { ...baseComponents.card, display: 'flex', flexDirection: 'column', minHeight: '400px' },
    cardHeader: { padding: spacing.lg, borderBottom: `1px solid ${colors.gray200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA', flexWrap: 'wrap', gap: spacing.md },
    cardTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.gray800, margin: 0 },
    cardSubtitle: { fontSize: typography.sizes.sm, color: colors.gray500, margin: '4px 0 0 0' },
    tableContainer: { overflowX: 'auto', width: '100%' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0', minWidth: '900px' },
    th: { padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: colors.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#F9FAFB', borderBottom: `1px solid ${colors.gray200}`, position: 'sticky', top: 0 },
    tr: { transition: 'background-color 0.15s ease', ':hover': { backgroundColor: '#F3F4F6' } },
    td: { padding: '14px 16px', fontSize: typography.sizes.sm, color: colors.gray700, borderBottom: `1px solid ${colors.gray100}`, verticalAlign: 'middle' },
    huBadge: { fontFamily: 'Consolas, monospace', fontSize: '0.8rem', backgroundColor: colors.gray100, color: colors.gray700, padding: '4px 8px', borderRadius: radius.md, border: `1px solid ${colors.gray300}`, fontWeight: '600', display: 'inline-block' },
    weightBadge: { fontSize: '0.9rem', fontWeight: '700', color: colors.primary },
    badgeInterna: { ...baseComponents.badge, backgroundColor: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
    badgeExterna: { ...baseComponents.badge, backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
    destBadge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.75rem', color: colors.gray600, backgroundColor: colors.gray100, borderRadius: '4px', textTransform: 'capitalize' },
    actionButton: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', borderRadius: '4px', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.gray600, ':hover': { backgroundColor: colors.gray100, color: colors.gray900 } },
    clasifGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.lg, marginTop: spacing.md },
    clasifCard: (color) => ({ ...baseComponents.card, padding: spacing.lg, borderTop: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: spacing.sm, transition: 'all 0.3s ease', cursor: 'pointer', userSelect: 'none' }),
    clasifLabel: { fontSize: typography.sizes.sm, color: colors.gray600, fontWeight: typography.weights.bold, textTransform: 'uppercase', letterSpacing: '0.05em' },
    clasifValue: (color) => ({ fontSize: '2.5rem', fontWeight: typography.weights.extrabold, color: color, lineHeight: 1.1 }),
    clasifSubtext: { fontSize: typography.sizes.sm, color: colors.gray500, marginTop: 'auto', paddingTop: spacing.sm, borderTop: `1px solid ${colors.gray100}`, display: 'flex', justifyContent: 'space-between' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: spacing.md, backdropFilter: 'blur(3px)' },
    modal: { backgroundColor: colors.surface, borderRadius: radius.xl, width: '95%', maxWidth: '850px', maxHeight: '90vh', overflow: 'hidden', boxShadow: shadows.xl, display: 'flex', flexDirection: 'column', position: 'relative' },
    modalHeader: { padding: '20px 24px', borderBottom: `1px solid ${colors.gray200}`, borderTop: `4px solid ${colors.primary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'start', backgroundColor: '#FAFAFA' },
    modalTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: colors.gray900, margin: 0 },
    modalSubtitle: { fontSize: '0.875rem', color: colors.gray500, margin: '4px 0 0 0' },
    modalContent: { overflowY: 'auto', padding: 0 },
    sectionTitle: { fontSize: typography.sizes.xs, fontWeight: 800, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: spacing.md, borderBottom: `1px solid ${colors.gray100}`, paddingBottom: '4px' },
    form: { padding: '24px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' },
    modalFooter: { padding: '20px 24px', borderTop: `1px solid ${colors.gray200}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: colors.surface }
  };

  if (loading) return <div style={styles.loadingPage}><LoadingSpinner message="Cargando dashboard..." /></div>;

  const tabs = [
    {
      id: 'historial',
      label: 'Historial de Entradas',
      content: (
        <CardTransition delay={100} style={styles.card}>
          <div style={styles.cardHeader}>
            <div><h3 style={styles.cardTitle}>Historial de Recepciones</h3><p style={styles.cardSubtitle}>Gestiona y consulta las entradas de material</p></div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ minWidth: '150px' }}><label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: colors.gray600, display: 'block', marginBottom: '4px' }}>Fecha</label><SmoothInput type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ height: '36px', fontSize: '0.85rem' }} /></div>
              <div style={{ minWidth: '200px' }}><label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: colors.gray600, display: 'block', marginBottom: '4px' }}>Buscar HU</label><SmoothInput value={filterHU} onChange={(e) => setFilterHU(e.target.value)} placeholder="Ej: 251209001" style={{ height: '36px', fontSize: '0.85rem' }} /></div>
              {(filterDate || filterHU) && (<SmoothButton variant="secondary" onClick={() => { setFilterDate(''); setFilterHU(''); }} style={{ height: '36px', fontSize: '0.8rem' }}>Limpiar</SmoothButton>)}
            </div>
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>HU ID</th><th style={styles.th}>Fecha Recepción</th><th style={styles.th}>Material</th><th style={styles.th}>Peso Neto</th><th style={styles.th}>Origen</th><th style={styles.th}>Detalle Origen</th><th style={styles.th}>Destino</th><th style={styles.th} align="center">Acciones</th></tr></thead>
              <tbody>
                {recepcionesFiltradas.map((r) => (
                  <tr key={r.id} style={styles.tr}>
                    <td style={styles.td}><div style={styles.huBadge}>{r.numero_hu}</div></td>
                    <td style={styles.td}><div style={{ fontWeight: '600', color: colors.gray800 }}>{new Date(r.fecha_entrada).toLocaleDateString()}</div><div style={{ fontSize: '0.75rem', color: colors.gray500 }}>{new Date(r.fecha_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></td>
                    <td style={styles.td}><strong>{r.tipo_material}</strong></td>
                    <td style={styles.td}><span style={styles.weightBadge}><AnimatedCounter value={r.peso_kg} duration={800} /> kg</span></td>
                    <td style={styles.td}><span style={r.origen_tipo === 'interna' ? styles.badgeInterna : styles.badgeExterna}>{r.origen_tipo === 'interna' ? 'Interna' : 'Externa'}</span></td>
                    <td style={styles.td}>{r.origen_especifico || <span style={{ color: colors.gray400 }}>--</span>}</td>
                    <td style={styles.td}><span style={styles.destBadge}>{r.destino}</span></td>
                    <td style={styles.td} align="center"><SmoothButton onClick={() => handleImprimirHU(r.id)} variant="secondary" style={styles.actionButton}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></SmoothButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardTransition>
      )
    },
    {
      id: 'clasificacion',
      label: 'Clasificación y Destino',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <CardTransition delay={0} style={styles.toolbar}>
            <div style={{ display: 'flex', gap: spacing.md, flexGrow: 1 }}><SmoothInput type="date" value={reporteFechas.inicio} onChange={(e) => setReporteFechas(prev => ({ ...prev, inicio: e.target.value }))} style={{ height: '36px' }} /><SmoothInput type="date" value={reporteFechas.fin} onChange={(e) => setReporteFechas(prev => ({ ...prev, fin: e.target.value }))} style={{ height: '36px' }} /></div>
            <ExcelExportButtons tipo="recepciones" filters={{ fechaInicio: reporteFechas.inicio, fechaFin: reporteFechas.fin }} />
          </CardTransition>
          <div style={styles.clasifGrid}>
            {Object.entries(statsClasificacion).map(([key, data]) => (
              <CardTransition key={key} style={styles.clasifCard(data.color)} onClick={() => setSelectedClasif(selectedClasif === key ? null : key)}>
                <div style={styles.clasifLabel}>{data.label}</div>
                <div style={styles.clasifValue(data.color)}><AnimatedCounter value={data.peso} /> kg</div>
                <div style={styles.clasifSubtext}>Entradas: {data.count}</div>
              </CardTransition>
            ))}
          </div>
          {selectedClasif && (
            <CardTransition style={styles.card}>
              <div style={styles.cardHeader}><h3>Detalle: {statsClasificacion[selectedClasif].label}</h3><SmoothButton variant="secondary" onClick={() => setSelectedClasif(null)}>Cerrar</SmoothButton></div>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>HU</th><th style={styles.th}>Material</th><th style={{ ...styles.th, textAlign: 'right' }}>Peso (kg)</th><th style={styles.th}>Mover a...</th></tr></thead>
                  <tbody>{materialesDetalle.map(r => (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}>{r.numero_hu}</td>
                      <td style={styles.td}>{r.tipo_material}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{r.peso_kg}</td>
                      <td style={styles.td}><SmoothSelect value={r.destino?.toLowerCase()} onChange={(e) => handleUpdateDestino(r.id, e.target.value)}><option value="almacenamiento">Almacenamiento</option><option value="reciclaje">Reciclaje</option><option value="venta">Venta</option></SmoothSelect></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </CardTransition>
          )}
        </div>
      )
    }
  ];

  const modalContent = (
    <div style={styles.modalOverlay} onClick={() => !enviando && setShowModal(false)}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Nueva Recepción de Scrap</h3><p style={styles.modalSubtitle}>Complete la información para generar el número de HU</p></div>
          <button onClick={() => setShowModal(false)} style={styles.actionButton}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <div style={styles.modalContent}>
          <form id="recepcionForm" onSubmit={handleSubmit} style={styles.form}>
            <div style={{ marginBottom: spacing.lg }}>
              <BasculaConnection onPesoObtenido={handlePesoFromBascula} campoDestino="peso_kg" />
            </div>

            <div style={styles.formGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                <h4 style={styles.sectionTitle}>Origen y Destino</h4>
                <SmoothSelect label="Tipo de Origen" name="origen_tipo" value={formData.origen_tipo} onChange={handleOrigenTipoChange} required>
                  <option value="externa">Externo (Proveedor/Cliente)</option>
                  <option value="interna">Interno (Planta/Producción)</option>
                </SmoothSelect>
                {formData.origen_tipo === 'externa' && (
                  <SmoothInput label="Nombre de Procedencia" name="origen_especifico" value={formData.origen_especifico} onChange={handleInputChange} placeholder="Ej: Planta Querétaro" required />
                )}
                <SmoothSelect label="Destino Final" name="destino" value={formData.destino} onChange={handleInputChange} required>
                  <option value="almacenamiento">Almacén General</option>
                  <option value="reciclaje">Proceso de Reciclaje</option>
                  <option value="venta">Venta a Terceros</option>
                </SmoothSelect>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                <h4 style={styles.sectionTitle}>Detalles del Pesaje</h4>
                <SmoothInput
                  label="Peso Neto (kg)" type="number" step="0.01" name="peso_kg" value={formData.peso_kg} onChange={handleInputChange} disabled={pesoBloqueado}
                  style={{ fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: pesoBloqueado ? colors.gray50 : colors.surface }}
                  rightElement={
                    <SmoothButton type="button" onClick={() => setPesoBloqueado(!pesoBloqueado)} variant={pesoBloqueado ? 'destructive' : 'secondary'} style={{ height: '32px' }}>
                      {pesoBloqueado ? "Capturado" : "Fijar Peso"}
                    </SmoothButton>
                  }
                  required
                />
                <SmoothSelect
                  label="Material Recibido" name="tipo_scrap_id" value={formData.tipo_scrap_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const m = listaMateriales.find(x => String(x.id) === String(id));
                    setFormData({ ...formData, tipo_scrap_id: id, tipo_material: m?.tipo_nombre || '' });
                  }}
                  required
                >
                  <option value="">Seleccione el tipo de material...</option>
                  {listaMateriales.map((m) => (<option key={m.id} value={m.id}>{m.tipo_nombre}</option>))}
                </SmoothSelect>
              </div>
            </div>

            <div style={{ marginTop: spacing.lg }}>
              <h4 style={styles.sectionTitle}>Notas Adicionales</h4>
              <textarea
                name="observaciones" value={formData.observaciones} onChange={handleInputChange}
                style={{ ...baseComponents.input, width: '100%', minHeight: '80px', padding: '12px', resize: 'vertical' }}
                placeholder="Describa cualquier anomalía o comentario..."
              />
            </div>
          </form>
        </div>

        <div style={styles.modalFooter}>
          {enviando && <LoadingSpinner size="small" />}
          <SmoothButton type="button" onClick={() => setShowModal(false)} variant="secondary" disabled={enviando}>Cancelar</SmoothButton>
          <SmoothButton onClick={() => document.getElementById('recepcionForm').requestSubmit()} variant="primary" disabled={enviando || !formData.peso_kg || !formData.tipo_scrap_id} style={{ minWidth: '180px' }}>
            {enviando ? 'Procesando...' : 'Guardar Registro'}
          </SmoothButton>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <PageWrapper style={{ height: 'auto' }}>
        <div style={styles.header}>
          <div><h1 style={styles.title}>Dashboard Receptor</h1><p style={styles.subtitle}>Bienvenido, {user?.name || 'Usuario'}</p></div>
          <SmoothButton onClick={() => setShowModal(true)} variant="primary" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nueva Recepción
          </SmoothButton>
        </div>
        <TabsAnimated tabs={tabs} />
        {showModal && createPortal(modalContent, document.body)}
      </PageWrapper>
    </div>
  );
};

export default ReceptorDashboard;