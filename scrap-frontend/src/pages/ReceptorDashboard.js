/* src/pages/ReceptorDashboard.js */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import BasculaConnection from '../components/BasculaConnection';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const listaMateriales = [
  "Lata de aluminio", "Desechos metálicos", "Desechos componentes eléctricos", 
  "Cable aluminio", "Cobre estañado", "Cable estañado", "Purga PE", 
  "Cable PE", "Cable PE 3.5", "Cable de batería", "Purga PVC", 
  "Cobre", "Botellas pet", "Plástico", "Cartón", "Fleje", "Leña"
];

const ReceptorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');

  const [pesoBloqueado, setPesoBloqueado] = useState(false);
  const [formData, setFormData] = useState({
    peso_kg: '',
    tipo_material: '',
    origen_tipo: 'externa',
    origen_especifico: '',
    destino: 'almacenamiento',
    lugar_almacenamiento: '',
    observaciones: ''
  });

  useEffect(() => {
    if (showModal) setPesoBloqueado(false);
  }, [showModal]);

  const loadReceptorData = useCallback(async () => {
    try {
      const recepcionesData = await apiClient.getRecepcionesScrap();
      setRecepciones(recepcionesData);
    } catch (error) {
      addToast('Error al cargar datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadReceptorData();
  }, [loadReceptorData]);

  const recepcionesFiltradas = recepciones.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.numero_hu.toLowerCase().includes(term) ||
      item.tipo_material.toLowerCase().includes(term) ||
      (item.origen_especifico && item.origen_especifico.toLowerCase().includes(term))
    );
  });

  const handleInputChange = (e) => {
    if (e.target.name === 'peso_kg' && pesoBloqueado) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOrigenTipoChange = (e) => {
    setFormData({ 
        ...formData, 
        [e.target.name]: e.target.value, 
        origen_especifico: '' 
    });
  };

  const handlePesoFromBascula = (peso, campo) => {
    if (!pesoBloqueado) {
      setFormData(prev => ({ ...prev, [campo]: peso }));
    }
  };

  const handleImprimirHU = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : `http://${window.location.hostname}:8000`;
      const url = `${baseUrl}/api/recepciones-scrap/${id}/imprimir-hu`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/pdf' }
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `HU-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast('HU descargada correctamente', 'success');
    } catch (error) {
      addToast('Error al imprimir HU: ' + error.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.createRecepcionScrap(formData);
      addToast(`Recepción creada! HU: ${response.numero_hu}`, 'success');
      setShowModal(false);
      setFormData({
        peso_kg: '', tipo_material: '', origen_tipo: 'externa', origen_especifico: '',
        destino: 'almacenamiento', lugar_almacenamiento: '', observaciones: ''
      });
      loadReceptorData();
    } catch (error) {
      const msg = error.message || 'Error desconocido';
      addToast('Error: ' + msg, 'error');
    }
  };

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>Cargando dashboard...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Receptor</h1>
          <p style={styles.subtitle}>Bienvenido, {user?.name || 'Usuario'}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Recepción
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Historial de Recepciones</h3>
            <p style={styles.cardSubtitle}>Gestiona y consulta las entradas de material</p>
          </div>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input 
              type="text" 
              placeholder="Buscar por HU, Material o Proveedor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>HU ID</th>
                <th style={styles.th}>Fecha Recepción</th>
                <th style={styles.th}>Material</th>
                <th style={styles.th}>Peso Neto</th>
                <th style={styles.th}>Origen</th>
                <th style={styles.th}>Detalle Origen</th>
                <th style={styles.th}>Destino</th>
                <th style={styles.th} align="center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recepcionesFiltradas.map((r) => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.huBadge}>{r.numero_hu}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.dateText}>
                        {new Date(r.fecha_entrada).toLocaleDateString()}
                    </div>
                    <div style={styles.timeText}>
                        {new Date(r.fecha_entrada).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <strong style={{color: colors.gray800}}>{r.tipo_material}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.weightBadge}>
                        {parseFloat(r.peso_kg).toFixed(2)} kg
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={r.origen_tipo === 'interna' ? styles.badgeInterna : styles.badgeExterna}>
                      {r.origen_tipo === 'interna' ? 'Interna' : 'Externa'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {r.origen_especifico ? (
                        <span style={styles.providerText}>{r.origen_especifico}</span>
                    ) : (
                        <span style={{color: colors.gray400, fontStyle: 'italic'}}>--</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.destBadge}>{r.destino}</span>
                  </td>
                  <td style={styles.td} align="center">
                    <button 
                      onClick={() => handleImprimirHU(r.id)} 
                      style={styles.actionButton}
                      title="Imprimir Etiqueta HU"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {recepcionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan="8" style={styles.emptyState}>
                    <div style={{marginBottom: '10px'}}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{color: colors.gray300}}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                    <div>No se encontraron registros</div>
                    {searchTerm && <div style={{fontSize: '0.85rem', marginTop: '5px', color: colors.gray500}}>Intenta con otro término de búsqueda</div>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={styles.tableFooter}>
            Mostrando <strong>{recepcionesFiltradas.length}</strong> registros
        </div>
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Nueva Recepción</h3>
                <p style={styles.modalSubtitle}>Ingrese los datos para generar la HU</p>
              </div>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div style={styles.modalContent}>
              <div style={{ padding: spacing.lg, paddingBottom: 0 }}>
                  <BasculaConnection 
                      onPesoObtenido={handlePesoFromBascula}
                      campoDestino="peso_kg"
                  />
              </div>

              <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: spacing.lg}}>
                      <div style={styles.formGroup}>
                          <label style={styles.label}>Tipo de Origen</label>
                          <select 
                          name="origen_tipo" 
                          value={formData.origen_tipo} 
                          onChange={handleOrigenTipoChange} 
                          style={styles.formSelect}
                          >
                          <option value="externa">Externa (Proveedor)</option>
                          <option value="interna">Interna (Planta)</option>
                          </select>
                      </div>

                      {formData.origen_tipo === 'externa' && (
                          <div style={styles.formGroup}>
                              <label style={styles.label}>Nombre del Proveedor</label>
                              <input 
                                  type="text" 
                                  name="origen_especifico" 
                                  value={formData.origen_especifico} 
                                  onChange={handleInputChange} 
                                  style={styles.formInput} 
                                  placeholder="Ej: Reciclados del Norte"
                                  required 
                              />
                          </div>
                      )}

                      <div style={styles.formGroup}>
                          <label style={styles.label}>Destino Inicial</label>
                          <select 
                          name="destino" 
                          value={formData.destino} 
                          onChange={handleInputChange} 
                          style={styles.formSelect}
                          >
                          <option value="almacenamiento">Almacenamiento General</option>
                          <option value="reciclaje">Directo a Reciclaje</option>
                          <option value="venta">Venta Directa</option>
                          </select>
                      </div>
                  </div>

                  <div style={{display: 'flex', flexDirection: 'column', gap: spacing.lg}}>
                      <div style={styles.formGroup}>
                          <label style={styles.label}>Peso Neto (kg)</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input 
                                  type="number" 
                                  step="0.01" 
                                  name="peso_kg" 
                                  value={formData.peso_kg} 
                                  onChange={handleInputChange} 
                                  style={{
                                      ...styles.formInput,
                                      paddingRight: '120px', 
                                      backgroundColor: pesoBloqueado ? colors.gray100 : (formData.peso_kg > 0 ? '#F0FDF4' : colors.surface),
                                      borderColor: pesoBloqueado ? colors.error : (formData.peso_kg > 0 ? colors.success : colors.gray300),
                                      color: pesoBloqueado ? colors.error : colors.gray900,
                                      fontWeight: pesoBloqueado ? 'bold' : 'normal'
                                  }} 
                                  placeholder="0.00"
                                  required 
                                  readOnly={pesoBloqueado}
                              />
                              <button
                                  type="button"
                                  onClick={() => setPesoBloqueado(!pesoBloqueado)}
                                  style={pesoBloqueado ? styles.btnLockedInside : styles.btnUnlockedInside}
                                  title={pesoBloqueado ? "Desbloquear" : "Fijar peso"}
                              >
                                  {pesoBloqueado ? (
                                    <>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                      </svg>
                                      FIJADO
                                    </>
                                  ) : (
                                    <>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                      </svg>
                                      FIJAR
                                    </>
                                  )}
                              </button>
                          </div>
                      </div>

                      <div style={styles.formGroup}>
                          <label style={styles.label}>Tipo de Material</label>
                          <select 
                              name="tipo_material" 
                              value={formData.tipo_material} 
                              onChange={handleInputChange} 
                              style={styles.formSelect}
                              required 
                          >
                              <option value="">Seleccionar material...</option>
                              {listaMateriales.map((material, index) => (
                                  <option key={index} value={material}>
                                      {material}
                                  </option>
                              ))}
                          </select>
                      </div>
                  </div>
              </div>

              <div style={{marginTop: spacing.md}}>
                  <label style={styles.label}>Observaciones</label>
                  <textarea 
                  name="observaciones" 
                  value={formData.observaciones} 
                  onChange={handleInputChange} 
                  style={styles.formTextarea} 
                  rows="3"
                  placeholder="Notas adicionales..."
                  ></textarea>
              </div>

              <div style={styles.modalFooter}>
                  <button type="button" onClick={() => setShowModal(false)} style={styles.modalSecondaryButton}>
                  Cancelar
                  </button>
                  <button type="submit" style={styles.modalPrimaryButton}>
                  Confirmar Recepción
                  </button>
              </div>
              </form>
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
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
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
  subtitle: {
    color: colors.gray600,
    fontSize: typography.sizes.lg,
    margin: 0,
    fontWeight: typography.weights.medium
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
  loadingText: {
    fontSize: typography.sizes.lg,
    color: colors.gray600,
    marginTop: spacing.sm
  },
  // Spinner actualizado al diseño unificado
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
  card: {
    ...baseComponents.card,
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  cardTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.gray800,
    margin: 0
  },
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray500,
    margin: '4px 0 0 0'
  },
  searchContainer: {
    position: 'relative',
    width: '300px',
    maxWidth: '100%'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.gray400,
    fontSize: '1rem',
    display: 'flex'
  },
  searchInput: {
    width: '100%',
    padding: '10px 10px 10px 36px',
    borderRadius: radius.md,
    border: `1px solid ${colors.gray300}`,
    fontSize: typography.sizes.sm,
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },
  tableContainer: {
    overflowX: 'auto',
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0',
    minWidth: '900px'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#F9FAFB',
    borderBottom: `1px solid ${colors.gray200}`,
    position: 'sticky',
    top: 0
  },
  tr: {
    transition: 'background-color 0.15s ease',
    ':hover': {
      backgroundColor: '#F3F4F6'
    }
  },
  td: {
    padding: '14px 16px',
    fontSize: typography.sizes.sm,
    color: colors.gray700,
    borderBottom: `1px solid ${colors.gray100}`,
    verticalAlign: 'middle'
  },
  huBadge: {
    fontFamily: 'Consolas, monospace',
    fontSize: '0.8rem',
    backgroundColor: colors.gray100,
    color: colors.gray700,
    padding: '4px 8px',
    borderRadius: radius.md,
    border: `1px solid ${colors.gray300}`,
    fontWeight: '600',
    display: 'inline-block'
  },
  dateText: {
    fontWeight: '600',
    color: colors.gray800
  },
  timeText: {
    fontSize: '0.75rem',
    color: colors.gray500
  },
  weightBadge: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: colors.primary
  },
  badgeInterna: {
    ...baseComponents.badge,
    backgroundColor: '#DBEAFE', 
    color: '#1E40AF', 
    border: '1px solid #BFDBFE'
  },
  badgeExterna: {
    ...baseComponents.badge,
    backgroundColor: '#D1FAE5', 
    color: '#065F46', 
    border: '1px solid #A7F3D0'
  },
  destBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.75rem',
    color: colors.gray600,
    backgroundColor: colors.gray100,
    borderRadius: '4px',
    textTransform: 'capitalize'
  },
  providerText: {
    fontWeight: '500',
    color: colors.gray900
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.gray600,
    ':hover': {
      backgroundColor: colors.gray100,
      color: colors.gray900
    }
  },
  emptyState: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.gray500,
    backgroundColor: '#FAFAFA'
  },
  tableFooter: {
    padding: '12px 16px',
    backgroundColor: '#F9FAFB',
    borderTop: `1px solid ${colors.gray200}`,
    fontSize: '0.85rem',
    color: colors.gray600,
    textAlign: 'right'
  },
  primaryButton: {
    ...baseComponents.buttonPrimary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    fontWeight: '600',
    gap: '8px',
    boxShadow: shadows.sm
  },
  btnLockedInside: {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: colors.error,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: radius.sm,
    padding: '4px 10px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    height: '24px',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
  btnUnlockedInside: {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: colors.gray200,
    color: colors.gray700,
    border: `1px solid ${colors.gray300}`,
    borderRadius: radius.sm,
    padding: '4px 10px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    height: '24px',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    ':hover': {
        backgroundColor: colors.gray300
    }
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: spacing.md,
    backdropFilter: 'blur(3px)'
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    width: '95%',
    maxWidth: '750px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    backgroundColor: '#FAFAFA'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: colors.gray900,
    margin: 0
  },
  modalSubtitle: {
    fontSize: '0.875rem',
    color: colors.gray500,
    margin: '4px 0 0 0'
  },
  modalContent: {
    overflowY: 'auto'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.gray400,
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '4px',
    borderRadius: '50%',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    ':hover': {
      backgroundColor: colors.gray200,
      color: colors.gray700
    }
  },
  form: {
    padding: '24px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    alignItems: 'start'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  formInput: {
    ...baseComponents.input,
    padding: '0 12px',
    height: '40px',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '0.9rem',
    borderColor: colors.gray300,
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`,
      outline: 'none'
    }
  },
  formSelect: {
    ...baseComponents.select,
    padding: '0 12px',
    height: '40px',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '0.9rem',
    borderColor: colors.gray300,
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`,
      outline: 'none'
    }
  },
  formTextarea: {
    ...baseComponents.input,
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    resize: 'vertical',
    fontFamily: typography.fontFamily,
    borderColor: colors.gray300,
    fontSize: '0.9rem',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`,
      outline: 'none'
    }
  },
  modalFooter: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  modalPrimaryButton: {
    ...baseComponents.buttonPrimary,
    padding: '10px 24px',
    height: '40px',
    fontSize: '0.9rem',
    boxShadow: shadows.md
  },
  modalSecondaryButton: {
    ...baseComponents.buttonSecondary,
    padding: '10px 24px',
    height: '40px',
    fontSize: '0.9rem'
  }
};

// Inyección de estilos de animación global
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  try {
    styleSheet.insertRule(`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `, styleSheet.cssRules.length);
  } catch (e) {}
}

export default ReceptorDashboard;