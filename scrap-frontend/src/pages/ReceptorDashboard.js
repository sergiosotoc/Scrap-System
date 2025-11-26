/* src/pages/ReceptorDashboard.js */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext'; 

const ReceptorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast(); 
  const [showModal, setShowModal] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estado de filtros ELIMINADO - no se necesita en receptor

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

  // ✅ CORREGIDO: useCallback para loadReceptorData
  const loadReceptorData = useCallback(async () => {
    try {
      const [recepcionesData, statsData, stockData] = await Promise.all([
        apiClient.getRecepcionesScrap(), // Sin filtros
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
  }, [loadReceptorData]); // ✅ CORREGIDO: dependencia correcta

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

  if (loading) return <div style={styles.loading}>Cargando...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Receptor</h1>
          <p style={styles.subtitle}>Bienvenido, {user.name}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
          ➕ Nueva Recepción
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
          <span style={styles.statNumber}>{stats?.total_peso_kg || 0} <small>kg</small></span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Stock Actual</span>
          <span style={styles.statNumber}>
            {stock.reduce((acc, item) => acc + parseFloat(item.cantidad_total || 0), 0).toFixed(1)} <small>kg</small>
          </span>
        </div>
      </div>

      {/* Tabla de Recepciones */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3>📋 Historial de Recepciones</h3>
          {/* ✅ ELIMINADO: Sección de filtros - no se necesita en receptor */}
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
                  <td style={styles.td}>{r.tipo_material}</td>
                  <td style={styles.td}><strong>{r.peso_kg} kg</strong></td>
                  <td style={styles.td}>{r.origen_tipo === 'interna' ? '🏭 Interna' : '🌐 Externa'}</td>
                  <td style={styles.td}>{r.destino}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleImprimirHU(r.id)} style={styles.actionButton}>🖨️</button>
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
              <h3>Nueva Recepción</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div>
                    <label style={styles.label}>Origen</label>
                    <select name="origen_tipo" value={formData.origen_tipo} onChange={handleOrigenTipoChange} style={styles.input}>
                        <option value="externa">Externa</option>
                        <option value="interna">Interna</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Peso (kg)</label>
                    <input type="number" step="0.01" name="peso_kg" value={formData.peso_kg} onChange={handleInputChange} style={styles.input} required />
                </div>
                <div>
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
                          <div key={m} onClick={() => handleSelectMaterial(m)} style={styles.dropdownItem}>{m}</div>
                        ))}
                        <div onClick={() => handleAddNewMaterial(formData.tipo_material)} style={{...styles.dropdownItem, fontWeight:'bold'}}>+ Nuevo: {formData.tipo_material}</div>
                      </div>
                    )}
                </div>
                <div>
                    <label style={styles.label}>Destino</label>
                    <select name="destino" value={formData.destino} onChange={handleInputChange} style={styles.input}>
                        <option value="almacenamiento">Almacenamiento</option>
                        <option value="reciclaje">Reciclaje</option>
                        <option value="venta">Venta</option>
                    </select>
                </div>
              </div>
              <div style={{marginTop: '1rem'}}>
                 <label style={styles.label}>Observaciones</label>
                 <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} style={styles.input} rows="2"></textarea>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.secondaryButton}>Cancelar</button>
                <button type="submit" style={styles.primaryButton}>Guardar Recepción</button>
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
    padding: '2rem', 
    backgroundColor: '#F3F4F6', 
    minHeight: '100vh' 
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '2rem' 
  },
  title: { 
    fontSize: '1.5rem', 
    fontWeight: '700', 
    color: '#111827', 
    margin: 0 
  },
  subtitle: { 
    color: '#6B7280', 
    marginTop: '0.25rem' 
  },
  loading: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    color: '#6B7280' 
  },
  gridStats: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
    gap: '1.5rem', 
    marginBottom: '2rem' 
  },
  statCard: { 
    backgroundColor: 'white', 
    padding: '1.5rem', 
    borderRadius: '12px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    display: 'flex', 
    flexDirection: 'column' 
  },
  statLabel: { 
    fontSize: '0.875rem', 
    color: '#6B7280', 
    fontWeight: '500' 
  },
  statNumber: { 
    fontSize: '2rem', 
    fontWeight: '700', 
    color: '#111827', 
    marginTop: '0.5rem' 
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
    overflow: 'hidden' 
  },
  cardHeader: { 
    padding: '1.5rem', 
    borderBottom: '1px solid #E5E7EB', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  tableContainer: { 
    overflowX: 'auto' 
  },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse' 
  },
  th: { 
    padding: '1rem 1.5rem', 
    textAlign: 'left', 
    fontSize: '0.75rem', 
    fontWeight: '700', 
    color: '#6B7280', 
    textTransform: 'uppercase', 
    backgroundColor: '#F9FAFB' 
  },
  tr: { 
    borderBottom: '1px solid #E5E7EB', 
    ':hover': { 
      backgroundColor: '#F9FAFB' 
    } 
  },
  td: { 
    padding: '1rem 1.5rem', 
    fontSize: '0.875rem', 
    color: '#374151' 
  },
  primaryButton: { 
    backgroundColor: '#2563EB', 
    color: 'white',
    padding: '0.75rem 1.5rem', 
    borderRadius: '8px', 
    border: 'none', 
    fontWeight: '600', 
    cursor: 'pointer', 
    transition: 'background 0.2s' 
  },
  secondaryButton: { 
    backgroundColor: 'white', 
    color: '#374151', 
    padding: '0.75rem 1.5rem', 
    borderRadius: '8px', 
    border: '1px solid #D1D5DB', 
    fontWeight: '600', 
    cursor: 'pointer', 
    marginRight: '1rem' 
  },
  actionButton: { 
    padding: '0.5rem', 
    borderRadius: '6px', 
    border: '1px solid #E5E7EB', 
    backgroundColor: 'white', 
    cursor: 'pointer' 
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
    zIndex: 50 
  },
  modal: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    width: '90%', 
    maxWidth: '600px', 
    maxHeight: '90vh', 
    overflowY: 'auto', 
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
  },
  modalHeader: { 
    padding: '1.5rem', 
    borderBottom: '1px solid #E5E7EB', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  modalFooter: { 
    padding: '1.5rem', 
    borderTop: '1px solid #E5E7EB', 
    display: 'flex', 
    justifyContent: 'flex-end' 
  },
  closeBtn: { 
    background: 'none', 
    border: 'none', 
    fontSize: '1.5rem', 
    cursor: 'pointer', 
    color: '#6B7280' 
  },
  form: { 
    padding: '1.5rem' 
  },
  formGrid: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: '1.5rem' 
  },
  label: { 
    display: 'block', 
    fontSize: '0.875rem', 
    fontWeight: '500', 
    color: '#374151', 
    marginBottom: '0.5rem' 
  },
  input: { 
    width: '100%', 
    padding: '0.75rem', 
    borderRadius: '6px', 
    border: '1px solid #D1D5DB', 
    fontSize: '0.875rem', 
    boxSizing: 'border-box' 
  },
  dropdown: { 
    position: 'absolute', 
    backgroundColor: 'white', 
    border: '1px solid #E5E7EB', 
    width: '200px', 
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
    borderRadius: '6px', 
    zIndex: 10 
  },
  dropdownItem: { 
    padding: '0.5rem 1rem', 
    cursor: 'pointer', 
    ':hover': { 
      backgroundColor: '#F3F4F6' 
    } 
  }
};

export default ReceptorDashboard;