/* src/pages/ReceptorDashboard.js */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const ReceptorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    peso_kg: '',
    tipo_material: '',
    origen_tipo: 'externa',
    origen_especifico: '',
    destino: 'almacenamiento',
    lugar_almacenamiento: '',
    observaciones: ''
  });

  const [tiposMaterial, setTiposMaterial] = useState(['cobre', 'aluminio', 'mixto', 'cobre_estanado']);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const loadReceptorData = useCallback(async () => {
    try {
      const [recepcionesData, statsData, stockData] = await Promise.all([
        apiClient.getRecepcionesScrap(),
        apiClient.getRecepcionScrapStats(),
        apiClient.getStockDisponible()
      ]);
      setRecepciones(recepcionesData);
      setStats(statsData);
      setStock(stockData);
    } catch (error) {
      addToast('Error al cargar datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadReceptorData();
  }, [loadReceptorData]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOrigenTipoChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value, origen_especifico: '' });
  };

  const handleMaterialChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectMaterial = (material) => {
    setFormData({ ...formData, tipo_material: material });
    setShowMaterialDropdown(false);
  };

  const handleAddNewMaterial = (material) => {
    if (material && !tiposMaterial.includes(material)) {
      setTiposMaterial(prev => [...prev, material]);
    }
    setFormData({ ...formData, tipo_material: material });
    setShowMaterialDropdown(false);
  };

  const handleImprimirHU = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const url = `http://localhost:8000/api/recepciones-scrap/${id}/imprimir-hu`;
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
      addToast('Error al crear recepción: ' + error.message, 'error');
    }
  };


  if (loading) return (
    <div style={styles.loading}>
      <div>Cargando dashboard receptor...</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Receptor</h1>
          <p style={styles.subtitle}>Bienvenido, {user.name}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
          <span>➕</span> Nueva Recepción
        </button>
      </div>

      {/* Estadísticas */}
      <div style={styles.gridStats}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Recepciones</span>
          <span style={styles.statNumber}>{stats?.total_recepciones || 0}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Peso Total</span>
          <span style={styles.statNumber}>
            {stats?.total_peso_kg || 0} 
            <small style={{ fontSize: typography.sizes.base, color: colors.gray500 }}> kg</small>
          </span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Stock Actual</span>
          <span style={styles.statNumber}>
            {stock.reduce((acc, item) => acc + parseFloat(item.cantidad_total || 0), 0).toFixed(1)} 
            <small style={{ fontSize: typography.sizes.base, color: colors.gray500 }}> kg</small>
          </span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Materiales Activos</span>
          <span style={styles.statNumber}>{tiposMaterial.length}</span>
        </div>
      </div>

      {/* Tabla de Recepciones */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={{ margin: 0, fontSize: typography.sizes.xl, color: colors.gray800 }}>
            📋 Historial de Recepciones
          </h3>
        </div>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>HU</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Material</th>
                <th style={styles.th}>Peso</th>
                <th style={styles.th}>Origen</th>
                <th style={styles.th}>Destino</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recepciones.map((r) => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}><strong>{r.numero_hu}</strong></td>
                  <td style={styles.td}>{new Date(r.fecha_entrada).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <span style={styles.materialBadge}>
                      {r.tipo_material}
                    </span>
                  </td>
                  <td style={styles.td}><strong>{r.peso_kg} kg</strong></td>
                  <td style={styles.td}>
                    <span style={styles.origenBadge}>
                      {r.origen_tipo === 'interna' ? '🏭 Interna' : '🌐 Externa'}
                    </span>
                  </td>
                  <td style={styles.td}>{r.destino}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleImprimirHU(r.id)} style={styles.actionButton}>
                      🖨️ Imprimir HU
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: typography.sizes.xl, color: colors.gray800 }}>
                Nueva Recepción de Material
              </h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div>
                    <label style={styles.label}>Origen</label>
                    <select 
                      name="origen_tipo" 
                      value={formData.origen_tipo} 
                      onChange={handleOrigenTipoChange} 
                      style={styles.input}
                    >
                        <option value="externa">Externa</option>
                        <option value="interna">Interna</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Peso (kg)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="peso_kg" 
                      value={formData.peso_kg} 
                      onChange={handleInputChange} 
                      style={styles.input} 
                      required 
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <label style={styles.label}>Material</label>
                    <input 
                        type="text" 
                        name="tipo_material" 
                        value={formData.tipo_material} 
                        onChange={handleMaterialChange} 
                        onFocus={() => setShowMaterialDropdown(true)}
                        style={styles.input} 
                        required 
                    />
                     {showMaterialDropdown && (
                      <div style={styles.dropdown}>
                        {tiposMaterial.map(m => (
                          <div 
                            key={m} 
                            onClick={() => handleSelectMaterial(m)} 
                            style={styles.dropdownItem}
                          >
                            {m}
                          </div>
                        ))}
                        <div 
                          onClick={() => handleAddNewMaterial(formData.tipo_material)} 
                          style={styles.dropdownItem}
                        >
                          + Nuevo: {formData.tipo_material}
                        </div>
                      </div>
                    )}
                </div>
                <div>
                    <label style={styles.label}>Destino</label>
                    <select 
                      name="destino" 
                      value={formData.destino} 
                      onChange={handleInputChange} 
                      style={styles.input}
                    >
                        <option value="almacenamiento">Almacenamiento</option>
                        <option value="reciclaje">Reciclaje</option>
                        <option value="venta">Venta</option>
                    </select>
                </div>
              </div>
              <div style={{marginTop: spacing.md}}>
                 <label style={styles.label}>Observaciones</label>
                 <textarea 
                   name="observaciones" 
                   value={formData.observaciones} 
                   onChange={handleInputChange} 
                   style={styles.input} 
                   rows="3"
                   placeholder="Observaciones adicionales..."
                 ></textarea>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.secondaryButton}>
                  Cancelar
                </button>
                <button type="submit" style={styles.primaryButton}>
                  Guardar Recepción
                </button>
              </div>
            </form>
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
    marginTop: spacing.xs,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: colors.gray500
  },
  gridStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.lg
  },
  statCard: {
    ...baseComponents.card,
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
    borderLeft: `4px solid ${colors.secondary}`,
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: shadows.lg
    }
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray600,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: spacing.xs
  },
  statNumber: {
    fontSize: '2.25rem',
    fontWeight: typography.weights.extrabold,
    color: colors.gray900,
    lineHeight: '1'
  },
  card: {
    ...baseComponents.card,
    overflow: 'hidden',
    marginBottom: spacing.lg
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray50
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
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
    letterSpacing: '0.05em'
  },
  tr: {
    borderBottom: `1px solid ${colors.gray200}`,
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: colors.gray50
    }
  },
  td: {
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.gray700
  },
  primaryButton: {
    ...baseComponents.buttonPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs
  },
  secondaryButton: {
    ...baseComponents.buttonSecondary,
    marginRight: spacing.md
  },
  actionButton: {
    ...baseComponents.buttonSecondary,
    padding: spacing.sm,
    fontSize: typography.sizes.sm
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
    padding: spacing.md,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    ...baseComponents.card,
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: shadows.xl
  },
  modalHeader: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray50
  },
  modalFooter: {
    padding: spacing.lg,
    borderTop: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'flex-end'
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
    ':hover': {
      backgroundColor: colors.gray200,
      color: colors.gray700
    }
  },
  form: {
    padding: spacing.lg
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg
  },
  label: {
    display: 'block',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray700,
    marginBottom: spacing.xs
  },
  input: {
    ...baseComponents.input,
    width: '100%'
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.gray200}`,
    width: '200px',
    boxShadow: shadows.lg,
    borderRadius: radius.md,
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto'
  },
  dropdownItem: {
    padding: spacing.sm,
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.gray200}`,
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: colors.gray100
    },
    ':last-child': {
      borderBottom: 'none',
      backgroundColor: colors.primaryLight,
      color: colors.primary,
      fontWeight: typography.weights.semibold
    }
  },
  materialBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    borderRadius: radius.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold
  },
  origenBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.gray200,
    color: colors.gray700,
    borderRadius: radius.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold
  }
};


export default ReceptorDashboard;