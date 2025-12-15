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
import QRCode from 'qrcode';
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

const ReceptorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listaMateriales, setListaMateriales] = useState([]); // Array de objetos {id, tipo_nombre}
  const loadedRef = useRef(false);
  const [selectedClasif, setSelectedClasif] = useState(null);
  const [filterHU, setFilterHU] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pesoBloqueado, setPesoBloqueado] = useState(false);
  const [formData, setFormData] = useState({
    peso_kg: '', tipo_material: '', origen_tipo: 'externa', origen_especifico: '',
    destino: 'almacenamiento', lugar_almacenamiento: '', observaciones: ''
  });

  const [reporteFechas, setReporteFechas] = useState({
      inicio: new Date().toISOString().slice(0, 10),
      fin: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') setShowModal(false);
    };
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

      if (Array.isArray(materialesData) && materialesData.length > 0) {
          setListaMateriales(materialesData); // Guardamos el objeto completo {id, nombre}
      } else {
          // Fallback por si la API falla
          setListaMateriales([
            { id: 999, tipo_nombre: 'Material Genérico' }
          ]);
      }

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

  // ... (El método handleImprimirHU se mantiene igual, no necesita cambios lógicos)
  // Omitido por brevedad ya que es visual/pdf y no afecta la lógica de DB
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
        format: [100, 150],
      });

      const width = 150;
      const height = 100;
      const margin = 5;
      const contentWidth = width - margin * 2;
      const colLeftCenter = 40; 
      const colRightCenter = 110;

      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.roundedRect(margin, margin, contentWidth, height - margin * 2, 3, 3);

      doc.line(margin, 25, width - margin, 25);

      if (logoData) {
        doc.addImage(logoData, 'PNG', margin + 2, margin + 2, 40, 15);
      } else {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 153);
        doc.text('COFICAB', margin + 5, 18);
      }

      doc.setFontSize(14);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'bold');
      doc.text('RECEPCIÓN SCRAP', width - margin - 5, 12, { align: 'right' });

      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      const fechaIngreso = new Date(recepcion.fecha_entrada).toLocaleDateString(
        'es-MX',
        { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      );
      doc.text(fechaIngreso.toUpperCase(), width - margin - 5, 20, { align: 'right' });

      const boxTop = 25;
      const boxHeight = 15;

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, boxTop, contentWidth, boxHeight, 'F');
      doc.line(margin, boxTop + boxHeight, width - margin, boxTop + boxHeight);

      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      const materialFull = recepcion.tipo_material.toUpperCase();
      let fontSize = 24;
      doc.setFontSize(fontSize);

      const maxTextWidth = contentWidth - 6;
      while (doc.getTextWidth(materialFull) > maxTextWidth && fontSize > 8) {
        fontSize -= 1;
        doc.setFontSize(fontSize);
      }

      const textY = boxTop + boxHeight / 2 + (fontSize * 0.35) / 2.5;
      doc.text(materialFull, width / 2, textY, { align: 'center' });

      doc.line(75, 40, 75, 85); 

      const barcodeWidth = 55;
      const barcodeX = colLeftCenter - (barcodeWidth / 2);

      const canvasBc = document.createElement('canvas');
      JsBarcode(canvasBc, recepcion.numero_hu, {
        format: 'CODE128',
        displayValue: false,
        height: 40,
        width: 2,
        margin: 0,
      });
      const barcodeImg = canvasBc.toDataURL('image/jpeg');
      doc.addImage(barcodeImg, 'JPEG', barcodeX, 42, barcodeWidth, 15);

      doc.setFontSize(10);
      doc.setFont('courier', 'bold');
      doc.setTextColor(0);
      doc.text(recepcion.numero_hu, colLeftCenter, 60, { align: 'center' });

      const qrSize = 16;
      const qrX = colLeftCenter - (qrSize / 2);
      
      try {
        const qrDataUrl = await QRCode.toDataURL(recepcion.numero_hu, {
          width: 100, margin: 0, errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        });
        doc.addImage(qrDataUrl, 'PNG', qrX, 64, qrSize, qrSize);
      } catch (e) {
        console.error('Error QR', e);
      }

      const startX = 80; 
      const lineY = 50;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Handling Unit ID:', startX, lineY);

      const labelWidth = doc.getTextWidth('Handling Unit ID:');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(recepcion.numero_hu, startX + labelWidth + 2, lineY);

      const boxWeightWidth = 60;
      const boxWeightX = colRightCenter - (boxWeightWidth / 2);
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.8);
      doc.roundedRect(boxWeightX, 58, boxWeightWidth, 22, 2, 2);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('PESO NETO (KG)', colRightCenter, 64, { align: 'center' });

      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      const pesoFormatted = parseFloat(recepcion.peso_kg).toFixed(2);
      doc.text(pesoFormatted, colRightCenter, 76, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(margin, 85, width - margin, 85);

      const footerY = 92;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text('ORIGEN:', margin + 2, footerY);

      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      const origenTexto = recepcion.origen_tipo === 'interna' ? 'PLANTA INTERNA' : (recepcion.origen_especifico || 'EXTERNO');
      doc.text(origenTexto.toUpperCase().substring(0, 28), margin + 18, footerY);

      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text('DESTINO:', 90, footerY);

      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      let destinoLabel = (recepcion.destino || 'ALMACEN').toUpperCase();
      doc.text(destinoLabel, 108, footerY);

      doc.setFontSize(6);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'normal');
      doc.text('Generado por Sistema de Control de Scrap - COFICAB', width / 2, 98, { align: 'center' });

      doc.save(`HU_${recepcion.numero_hu}.pdf`);
      addToast('Etiqueta generada correctamente', 'success');
    } catch (error) {
      console.error('Error generando PDF:', error);
      addToast('Error al generar etiqueta: ' + error.message, 'error');
    }
  };

  const handleUpdateDestino = async (id, nuevoDestino) => {
    const previousState = [...recepciones];
    setRecepciones(prev => prev.map(r => 
        r.id === id ? { ...r, destino: nuevoDestino } : r
    ));

    try {
        await apiClient.updateRecepcionScrap(id, { destino: nuevoDestino });
        addToast(`Destino actualizado a: ${nuevoDestino}`, 'success');
    } catch (error) {
        setRecepciones(previousState);
        addToast('Error al actualizar destino: ' + error.message, 'error');
    }
  };

  const recepcionesFiltradas = useMemo(() => {
    return recepciones.filter(item => {
      const matchHU = filterHU 
        ? item.numero_hu.toLowerCase().includes(filterHU.toLowerCase())
        : true;
      let matchDate = true;
      if (filterDate) {
          const itemDate = new Date(item.fecha_entrada).toISOString().split('T')[0];
          matchDate = itemDate === filterDate;
      }
      return matchHU && matchDate;
    });
  }, [recepciones, filterHU, filterDate]);

  const recepcionesVisualizadas = useMemo(() => {
    if (!reporteFechas.inicio || !reporteFechas.fin) return recepciones;
    return recepciones.filter(r => {
        const fechaEntrada = new Date(r.fecha_entrada).toISOString().split('T')[0];
        return fechaEntrada >= reporteFechas.inicio && fechaEntrada <= reporteFechas.fin;
    });
  }, [recepciones, reporteFechas]);

  const statsClasificacion = useMemo(() => {
      const stats = {
          almacenamiento: { peso: 0, count: 0, label: 'Almacenamiento General', color: colors.primary },
          reciclaje: { peso: 0, count: 0, label: 'Directo a Reciclaje', color: colors.success },
          venta: { peso: 0, count: 0, label: 'Venta Directa', color: colors.warning }
      };

      recepcionesVisualizadas.forEach(r => {
          let key = 'almacenamiento';
          const destinoLower = r.destino?.toLowerCase() || '';
          if (destinoLower.includes('reciclaje')) key = 'reciclaje';
          else if (destinoLower.includes('venta')) key = 'venta';
          
          stats[key].peso += parseFloat(r.peso_kg) || 0;
          stats[key].count += 1;
      });
      return stats;
  }, [recepcionesVisualizadas]);

  const materialesDetalle = useMemo(() => {
    if (!selectedClasif) return [];
    return recepcionesVisualizadas.filter(r => {
        const destinoLower = r.destino?.toLowerCase() || '';
        if (selectedClasif === 'reciclaje') return destinoLower.includes('reciclaje');
        if (selectedClasif === 'venta') return destinoLower.includes('venta');
        return !destinoLower.includes('reciclaje') && !destinoLower.includes('venta'); 
    }).sort((a, b) => new Date(b.fecha_entrada) - new Date(a.fecha_entrada));
  }, [recepcionesVisualizadas, selectedClasif]);

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
      setFormData(prev => {
          if (prev[campo] === peso) return prev;
          return { ...prev, [campo]: peso };
      });
    }
  }, [pesoBloqueado]);

  const triggerSubmit = () => {
      const form = document.getElementById('recepcionForm');
      if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return; 
    setEnviando(true);
    try {
      // Enviamos el nombre del material como 'tipo_material'
      // El backend buscará el ID o usará el nombre si no lo encuentra (aunque debería encontrarlo)
      const response = await apiClient.createRecepcionScrap(formData);
      addToast(`Recepción creada! HU: ${response.numero_hu}`, 'success');
      setShowModal(false);
      setFormData({
        peso_kg: '', tipo_material: '', origen_tipo: 'externa', origen_especifico: '',
        destino: 'almacenamiento', lugar_almacenamiento: '', observaciones: ''
      });
      loadReceptorData();
    } catch (error) {
      addToast('Error: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
        setEnviando(false);
    }
  };

  // ... (Estilos iguales al original)
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
    modal: { backgroundColor: colors.surface, borderRadius: radius.xl, width: '95%', maxWidth: '750px', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' },
    modalHeader: { padding: '20px 24px', borderBottom: `1px solid ${colors.gray200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'start', backgroundColor: '#FAFAFA', flexShrink: 0 },
    modalTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: colors.gray900, margin: 0 },
    modalSubtitle: { fontSize: '0.875rem', color: colors.gray500, margin: '4px 0 0 0' },
    modalContent: { overflowY: 'auto', flex: '1 1 auto', minHeight: 0, padding: 0 },
    form: { padding: '24px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    modalFooter: { padding: '20px 24px', borderTop: `1px solid ${colors.gray200}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0, backgroundColor: colors.surface }
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
                        <div style={{ minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: colors.gray600, display: 'block', marginBottom: '4px' }}>Fecha</label>
                            <SmoothInput type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ height: '36px', fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ minWidth: '200px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: colors.gray600, display: 'block', marginBottom: '4px' }}>Buscar HU</label>
                            <SmoothInput value={filterHU} onChange={(e) => setFilterHU(e.target.value)} placeholder="Ej: 251209001" style={{ height: '36px', fontSize: '0.85rem' }} rightElement={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: colors.gray400}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>} />
                        </div>
                        {(filterDate || filterHU) && (<SmoothButton variant="secondary" onClick={() => {setFilterDate(''); setFilterHU('');}} style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', color: colors.gray600 }} title="Limpiar filtros">Limpiar</SmoothButton>)}
                    </div>
                </div>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead><tr><th style={styles.th}>HU ID</th><th style={styles.th}>Fecha Recepción</th><th style={styles.th}>Material</th><th style={styles.th}>Peso Neto</th><th style={styles.th}>Origen</th><th style={styles.th}>Detalle Origen</th><th style={styles.th}>Destino</th><th style={styles.th} align="center">Acciones</th></tr></thead>
                        <tbody>
                        {recepcionesFiltradas.map((r) => (
                            <tr key={r.id} style={styles.tr}>
                            <td style={styles.td}><div style={styles.huBadge}>{r.numero_hu}</div></td>
                            <td style={styles.td}><div style={{fontWeight: '600', color: colors.gray800}}>{new Date(r.fecha_entrada).toLocaleDateString()}</div><div style={{fontSize: '0.75rem', color: colors.gray500}}>{new Date(r.fecha_entrada).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></td>
                            <td style={styles.td}><strong style={{color: colors.gray800}}>{r.tipo_material}</strong></td>
                            <td style={styles.td}>
                                <span style={styles.weightBadge}>
                                    <AnimatedCounter value={r.peso_kg} duration={800} decimals={2} /> kg
                                </span>
                            </td>
                            <td style={styles.td}><span style={r.origen_tipo === 'interna' ? styles.badgeInterna : styles.badgeExterna}>{r.origen_tipo === 'interna' ? 'Interna' : 'Externa'}</span></td>
                            <td style={styles.td}>{r.origen_especifico ? <span style={{fontWeight: '500', color: colors.gray900}}>{r.origen_especifico}</span> : <span style={{color: colors.gray400, fontStyle: 'italic'}}>--</span>}</td>
                            <td style={styles.td}><span style={styles.destBadge}>{r.destino}</span></td>
                            <td style={styles.td} align="center">
                                <SmoothButton onClick={() => handleImprimirHU(r.id)} variant="secondary" style={styles.actionButton} title="Imprimir Etiqueta HU">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                </SmoothButton>
                            </td>
                            </tr>
                        ))}
                        {recepcionesFiltradas.length === 0 && (<tr><td colSpan="8" style={{padding: spacing.xl, textAlign: 'center', color: colors.gray500, backgroundColor: '#FAFAFA'}}>No se encontraron registros</td></tr>)}
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
                    <div style={{display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexGrow: 1}}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}><label style={{fontSize: '0.75rem', fontWeight: 'bold', color: colors.gray600}}>Fecha Inicio</label><SmoothInput type="date" value={reporteFechas.inicio} onChange={(e) => setReporteFechas(prev => ({...prev, inicio: e.target.value}))} style={{height: '36px'}} /></div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}><label style={{fontSize: '0.75rem', fontWeight: 'bold', color: colors.gray600}}>Fecha Fin</label><SmoothInput type="date" value={reporteFechas.fin} onChange={(e) => setReporteFechas(prev => ({...prev, fin: e.target.value}))} style={{height: '36px'}} /></div>
                    </div>
                    <div><ExcelExportButtons tipo="recepciones" filters={{ fechaInicio: reporteFechas.inicio, fechaFin: reporteFechas.fin, destino: selectedClasif || '' }} buttonText={selectedClasif ? `Reporte ${statsClasificacion[selectedClasif].label}` : "Reporte General"} buttonStyle={{ height: '36px', padding: '0 20px' }} /></div>
                </CardTransition>

                <div style={styles.clasifGrid}>
                    {Object.entries(statsClasificacion).map(([key, data], index) => {
                        const isSelected = selectedClasif === key;
                        return (
                        <CardTransition key={key} delay={index * 100} style={{ ...styles.clasifCard(data.color), transform: isSelected ? 'translateY(-4px)' : 'translateY(0)', boxShadow: isSelected ? `0 0 0 2px ${data.color}, ${shadows.lg}` : shadows.md, opacity: selectedClasif && !isSelected ? 0.6 : 1 }} onClick={() => setSelectedClasif(isSelected ? null : key)}>
                            <div style={styles.clasifLabel}>{data.label}</div>
                            <div style={styles.clasifValue(data.color)}><AnimatedCounter value={data.peso} decimals={2} /><span style={{fontSize: '1rem', color: colors.gray400, marginLeft: '8px', fontWeight: 'normal'}}>kg</span></div>
                            <div style={styles.clasifSubtext}><span>Entradas: <strong><AnimatedCounter value={data.count} decimals={0} duration={500} /></strong></span><span style={{textDecoration: isSelected ? 'underline' : 'none', color: isSelected ? data.color : colors.gray400}}>{isSelected ? 'Ocultar detalle' : 'Ver detalle'}</span></div>
                        </CardTransition>
                    )})}
                </div>

                {selectedClasif && (
                    <CardTransition delay={0} style={{...styles.card, animation: 'slideInUp 0.3s ease-out'}}>
                        <div style={{...styles.cardHeader, backgroundColor: statsClasificacion[selectedClasif].color + '10', borderBottomColor: statsClasificacion[selectedClasif].color + '30'}}>
                            <h3 style={{...styles.cardTitle, color: statsClasificacion[selectedClasif].color, fontSize: '1.1rem'}}>Gestión de Stock: {statsClasificacion[selectedClasif].label}</h3>
                            <SmoothButton variant="secondary" onClick={() => setSelectedClasif(null)} style={{height: '32px', padding: '0 12px', fontSize: '0.8rem'}}>Cerrar</SmoothButton>
                        </div>
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead><tr><th style={styles.th}>HU</th><th style={styles.th}>Fecha</th><th style={styles.th}>Material</th><th style={styles.th}>Origen</th><th style={{...styles.th, textAlign: 'right'}}>Peso (kg)</th><th style={{...styles.th, width: '200px'}}>Mover a...</th></tr></thead>
                                <tbody>
                                    {materialesDetalle.map((r) => (
                                        <tr key={r.id} style={styles.tr}>
                                            <td style={styles.td}><div style={styles.huBadge}>{r.numero_hu}</div></td>
                                            <td style={styles.td}><div style={{fontSize: '0.8rem', color: colors.gray600}}>{new Date(r.fecha_entrada).toLocaleDateString()}</div></td>
                                            <td style={styles.td}><strong>{r.tipo_material}</strong></td>
                                            <td style={styles.td}><span style={{fontSize: '0.8rem'}}>{r.origen_especifico || 'Interno'}</span></td>
                                            <td style={{...styles.td, textAlign: 'right', fontFamily: typography.fontMono, fontWeight: 'bold'}}>
                                                <AnimatedCounter value={r.peso_kg} duration={800} decimals={2} />
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{width: '180px'}}>
                                                    <SmoothSelect value={r.destino?.toLowerCase() || 'almacenamiento'} onChange={(e) => handleUpdateDestino(r.id, e.target.value)} style={{ height: '32px', fontSize: '0.8rem', padding: '0 30px 0 10px', backgroundColor: colors.surface }}>
                                                        <option value="almacenamiento">Almacenamiento</option>
                                                        <option value="reciclaje">Reciclaje</option>
                                                        <option value="venta">Venta</option>
                                                    </SmoothSelect>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {materialesDetalle.length === 0 && (<tr><td colSpan="6" style={{padding: '40px', textAlign: 'center', color: colors.gray500}}>No hay registros en esta categoría actualmente</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </CardTransition>
                )}
            </div>
        )
    } 
  ];

  const modalContent = (
    <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <div><h3 style={styles.modalTitle}>Nueva Recepción</h3><p style={styles.modalSubtitle}>Ingrese los datos para generar la HU</p></div>
                <SmoothButton onClick={() => setShowModal(false)} variant="secondary" style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: colors.gray500}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></SmoothButton>
            </div>
            <div style={styles.modalContent}>
                <div style={{ padding: spacing.lg, paddingBottom: 0 }}><BasculaConnection onPesoObtenido={handlePesoFromBascula} campoDestino="peso_kg" /></div>
                <form id="recepcionForm" onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGrid}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: spacing.lg}}>
                            <SmoothSelect label="Tipo de Origen" name="origen_tipo" value={formData.origen_tipo} onChange={handleOrigenTipoChange}>
                                <option value="externa">Externa (Proveedor)</option>
                                <option value="interna">Interna (Planta)</option>
                            </SmoothSelect>
                            {formData.origen_tipo === 'externa' && (<SmoothInput label="Nombre del Proveedor" type="text" name="origen_especifico" value={formData.origen_especifico} onChange={handleInputChange} placeholder="Ej: Reciclados del Norte" required />)}
                            <SmoothSelect label="Destino Inicial" name="destino" value={formData.destino} onChange={handleInputChange}>
                                <option value="almacenamiento">Almacenamiento General</option>
                                <option value="reciclaje">Directo a Reciclaje</option>
                                <option value="venta">Venta Directa</option>
                            </SmoothSelect>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: spacing.lg}}>
                            <div style={styles.formGroup}>
                                <SmoothInput label="Peso Neto (kg)" type="number" step="0.01" name="peso_kg" value={formData.peso_kg} onChange={handleInputChange} placeholder="0.00" required disabled={pesoBloqueado}
                                    style={{ backgroundColor: pesoBloqueado ? colors.gray100 : (formData.peso_kg > 0 ? '#F0FDF4' : colors.surface), borderColor: pesoBloqueado ? colors.error : undefined, color: pesoBloqueado ? colors.error : undefined, fontWeight: pesoBloqueado ? 'bold' : 'normal' }}
                                    rightElement={<SmoothButton type="button" onClick={() => setPesoBloqueado(!pesoBloqueado)} variant={pesoBloqueado ? 'destructive' : 'secondary'} style={{ padding: '0 8px', height: '24px', fontSize: '10px', textTransform: 'uppercase' }} title={pesoBloqueado ? "Desbloquear" : "Fijar peso"}>{pesoBloqueado ? "Fijado" : "Fijar"}</SmoothButton>} />
                            </div>
                            
                            <SmoothSelect label="Tipo de Material" name="tipo_material" value={formData.tipo_material} onChange={handleInputChange} required>
                                <option value="">Seleccionar material...</option>
                                {listaMateriales.map((material) => (
                                    <option key={material.id} value={material.tipo_nombre}>{material.tipo_nombre}</option>
                                ))}
                            </SmoothSelect>
                        </div>
                    </div>
                    <div style={{marginTop: spacing.md}}>
                        <label style={{fontSize: typography.sizes.xs, fontWeight: 700, color: colors.gray600, textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '2px', display: 'block', marginBottom: '6px'}}>Observaciones</label>
                        <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} style={{ ...baseComponents.input, width: '100%', minHeight: '80px', padding: '12px', resize: 'vertical', fontFamily: typography.fontFamily, borderColor: colors.gray300, fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s ease', borderRadius: radius.md, boxSizing: 'border-box' }} rows="3" placeholder="Notas adicionales..." onFocus={(e) => { e.target.style.borderColor = colors.primary; e.target.style.boxShadow = `0 0 0 4px ${colors.primary}15`; }} onBlur={(e) => { e.target.style.borderColor = colors.gray300; e.target.style.boxShadow = 'none'; }}></textarea>
                    </div>
                </form>
            </div>
            <div style={styles.modalFooter}>
                <SmoothButton type="button" onClick={() => setShowModal(false)} variant="secondary">Cancelar</SmoothButton>
                <SmoothButton onClick={triggerSubmit} variant="primary" disabled={enviando}>{enviando ? 'Guardando...' : 'Confirmar Recepción'}</SmoothButton>
            </div>
        </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`@keyframes slideInUp { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <PageWrapper style={{ height: 'auto' }}>
        <div style={styles.header}>
          <div><h1 style={styles.title}>Dashboard Receptor</h1><p style={styles.subtitle}>Bienvenido, {user?.name || 'Usuario'}</p></div>
          <SmoothButton onClick={() => setShowModal(true)} variant="primary" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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