// src/pages/ReceptorDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

const ReceptorDashboard = () => {
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [registrosPendientes, setRegistrosPendientes] = useState([]);
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reporteData, setReporteData] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [filtros, setFiltros] = useState({
    origen_tipo: '',
    destino: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const [formData, setFormData] = useState({
    registro_scrap_id: '',
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
  const [nuevoMaterial, setNuevoMaterial] = useState('');

  useEffect(() => {
    loadReceptorData();
  }, [filtros]);

  // En la función loadReceptorData, modifica así:
  const loadReceptorData = async () => {
    try {
      console.log('🔄 Cargando datos del receptor...');

      const [recepcionesData, pendientesData, statsData, stockData] = await Promise.all([
        apiClient.getRecepcionesScrap(filtros),
        apiClient.getRegistrosPendientes(),
        apiClient.getRecepcionScrapStats(),
        apiClient.getStockDisponible()
      ]);

      console.log('📋 Recepciones:', recepcionesData);
      console.log('📦 Stock:', stockData);

      setRecepciones(recepcionesData);
      setRegistrosPendientes(pendientesData);
      setStats(statsData);
      setStock(stockData);
    } catch (error) {
      console.error('❌ Error cargando datos del receptor:', error);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'registro_scrap_id' && value) {
      const registro = registrosPendientes.find(r => r.id === parseInt(value));
      if (registro) {
        setFormData(prev => ({
          ...prev,
          peso_kg: registro.peso_total,
          tipo_material: registro.tipo_material,
          origen_especifico: `${registro.area_real} - ${registro.maquina_real}`
        }));
      }
    }
  };

  const handleOrigenTipoChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: value,
        registro_scrap_id: ''
      };

      if (value === 'interna' && registrosPendientes.length > 0) {
        const primerRegistro = registrosPendientes[0];
        newFormData.registro_scrap_id = primerRegistro.id.toString();
        newFormData.peso_kg = primerRegistro.peso_total;
        newFormData.tipo_material = primerRegistro.tipo_material;
        newFormData.origen_especifico = `${primerRegistro.area_real} - ${primerRegistro.maquina_real}`;
      } else if (value === 'externa') {
        newFormData.peso_kg = '';
        newFormData.tipo_material = '';
        newFormData.origen_especifico = '';
      }

      return newFormData;
    });
  };

  const handleMaterialChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setNuevoMaterial(value);
  };

  const handleSelectMaterial = (material) => {
    setFormData(prev => ({
      ...prev,
      tipo_material: material
    }));
    setShowMaterialDropdown(false);
  };

  const handleAddNewMaterial = (material) => {
    if (material && !tiposMaterial.includes(material)) {
      setTiposMaterial(prev => [...prev, material]);
    }
    setFormData(prev => ({
      ...prev,
      tipo_material: material
    }));
    setShowMaterialDropdown(false);
  };

  const handleImprimirHU = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const url = `http://localhost:8000/api/recepciones-scrap/${id}/imprimir-hu`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Obtener el blob
      const blob = await response.blob();

      // Crear URL para el blob
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      // Obtener nombre del archivo del header
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `HU-${id}.pdf`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      alert('✅ HU impresa correctamente');

    } catch (error) {
      console.error('❌ Error al imprimir HU:', error);
      alert('❌ Error al imprimir HU: ' + error.message);
    }
  };

  const generarReporteRecepcion = async () => {
    try {
      const reporte = await apiClient.getReporteRecepcion(filtros);
      setReporteData(reporte);
      setMostrarReporte(true);
    } catch (error) {
      alert('Error generando reporte: ' + error.message);
    }
  };

  const imprimirReporte = () => {
    window.print();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const datosAEnviar = {
      peso_kg: formData.peso_kg,
      tipo_material: formData.tipo_material,
      origen_tipo: formData.origen_tipo,
      origen_especifico: formData.origen_especifico,
      destino: formData.destino,
      observaciones: formData.observaciones || '',
      lugar_almacenamiento: formData.lugar_almacenamiento || ''
    };

    if (formData.registro_scrap_id && formData.registro_scrap_id !== '') {
      datosAEnviar.registro_scrap_id = formData.registro_scrap_id;
    }

    try {
      const response = await apiClient.createRecepcionScrap(datosAEnviar);
      alert(`✅ Recepción creada exitosamente! Número HU: ${response.numero_hu}`);
      setShowModal(false);
      setFormData({
        registro_scrap_id: '',
        peso_kg: '',
        tipo_material: '',
        origen_tipo: 'externa',
        origen_especifico: '',
        destino: 'almacenamiento',
        lugar_almacenamiento: '',
        observaciones: ''
      });
      loadReceptorData();
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const getDestinoLabel = (destino) => {
    const destinos = {
      reciclaje: '♻️ Reciclaje',
      venta: '💰 Venta',
      almacenamiento: '🏪 Almacenamiento'
    };
    return destinos[destino] || destino;
  };

  const getOrigenTipoLabel = (tipo) => {
    return tipo === 'interna' ? '🏭 Interna' : '🌐 Externa';
  };

  if (loading) {
    return <div style={styles.loading}>📊 Cargando dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1>🏷️ Dashboard - Receptor de Scrap</h1>
          <p>Bienvenido, {user.name}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
          ➕ Nueva Recepción
        </button>
      </div>

      {/* Estadísticas */}
      <section style={styles.statsSection}>
        <h2>📈 Estadísticas</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>📋 Total Recepciones</h3>
            <p style={styles.statNumber}>{stats?.total_recepciones || 0}</p>
          </div>
          <div style={styles.statCard}>
            <h3>⚖️ Peso Total</h3>
            <p style={styles.statNumber}>{stats?.total_peso_kg || 0} kg</p>
          </div>
          <div style={styles.statCard}>
            <h3>⏳ Pendientes</h3>
            <p style={styles.statNumber}>{stats?.registros_pendientes || 0}</p>
          </div>
          <div style={styles.statCard}>
            <h3>📦 Stock Total</h3>
            <p style={styles.statNumber}>
              {stock.reduce((sum, item) => sum + (parseFloat(item.cantidad_total) || 0), 0)} kg
            </p>
          </div>
        </div>

        {/* Distribución por destino */}
        {stats?.destinos && stats.destinos.length > 0 && (
          <div style={styles.destinosSection}>
            <h3>🎯 Distribución por Destino</h3>
            <div style={styles.destinosGrid}>
              {stats.destinos.map((destino, index) => (
                <div key={index} style={styles.destinoCard}>
                  <h4>{getDestinoLabel(destino.destino)}</h4>
                  <p>{destino.count} recepciones</p>
                  <p>{destino.peso_total} kg</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Stock Disponible */}
      <section style={styles.stockSection}>
        <h2>📦 Stock Disponible</h2>
        <div style={styles.stockGrid}>
          {stock.map((item, index) => (
            <div key={index} style={styles.stockCard}>
              <h4>{item.tipo_material.toUpperCase()}</h4>
              <p style={styles.stockCantidad}>{item.cantidad_total} kg</p>
              <p style={styles.stockLotes}>{item.numero_lotes} lotes</p>
            </div>
          ))}
          {stock.length === 0 && (
            <div style={styles.emptyState}>
              No hay stock disponible actualmente.
            </div>
          )}
        </div>
      </section>

      {/* Filtros y Reporte */}
      <section style={styles.filtrosSection}>
        <div style={styles.filtrosHeader}>
          <h3>🔍 Filtros</h3>
          <button
            onClick={generarReporteRecepcion}
            style={styles.reporteButton}
          >
            📊 Generar Reporte
          </button>
        </div>
        <div style={styles.filtrosGrid}>
          <div style={styles.filtroGroup}>
            <label>Origen:</label>
            <select name="origen_tipo" value={filtros.origen_tipo} onChange={handleFiltroChange}>
              <option value="">Todos los orígenes</option>
              <option value="interna">Interna</option>
              <option value="externa">Externa</option>
            </select>
          </div>
          <div style={styles.filtroGroup}>
            <label>Destino:</label>
            <select name="destino" value={filtros.destino} onChange={handleFiltroChange}>
              <option value="">Todos los destinos</option>
              <option value="reciclaje">Reciclaje</option>
              <option value="venta">Venta</option>
              <option value="almacenamiento">Almacenamiento</option>
            </select>
          </div>
          <div style={styles.filtroGroup}>
            <label>Fecha inicio:</label>
            <input
              type="date"
              name="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={handleFiltroChange}
            />
          </div>
          <div style={styles.filtroGroup}>
            <label>Fecha fin:</label>
            <input
              type="date"
              name="fecha_fin"
              value={filtros.fecha_fin}
              onChange={handleFiltroChange}
            />
          </div>
        </div>
      </section>

      {/* Modal de Reporte */}
      {mostrarReporte && reporteData && (
        <div style={styles.reporteModal}>
          <div style={styles.reporteContent}>
            <div style={styles.reporteHeader}>
              <h2>📊 Reporte de Recepción de Scrap</h2>
              <button onClick={() => setMostrarReporte(false)}>✕</button>
            </div>

            <div style={styles.reporteBody}>
              <div style={styles.totalesSection}>
                <h3>Totales Generales</h3>
                <div style={styles.totalesGrid}>
                  <div>Total Recepciones: {reporteData.totales?.total_recepciones || 0}</div>
                  <div>Peso Total: {reporteData.totales?.total_peso || 0} kg</div>
                </div>
              </div>

              <table style={styles.reporteTable}>
                <thead>
                  <tr>
                    <th>HU</th>
                    <th>Fecha</th>
                    <th>Material</th>
                    <th>Peso (kg)</th>
                    <th>Origen</th>
                    <th>Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {reporteData.recepciones?.map(recepcion => (
                    <tr key={recepcion.id}>
                      <td>{recepcion.numero_hu}</td>
                      <td>{new Date(recepcion.fecha_entrada).toLocaleDateString()}</td>
                      <td>{recepcion.tipo_material}</td>
                      <td>{recepcion.peso_kg}</td>
                      <td>{recepcion.origen_especifico}</td>
                      <td>{recepcion.destino}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.reporteActions}>
              <button onClick={imprimirReporte}>🖨️ Imprimir Reporte</button>
              <button onClick={() => setMostrarReporte(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Registros Pendientes */}
      <section style={styles.pendientesSection}>
        <h2>⏳ Registros Pendientes de Recepción ({registrosPendientes.length})</h2>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Turno</th>
                <th style={styles.th}>Peso (kg)</th>
                <th style={styles.th}>Área/Máquina</th>
                <th style={styles.th}>Operador</th>
              </tr>
            </thead>
            <tbody>
              {registrosPendientes.map(registro => (
                <tr key={registro.id} style={styles.tr}>
                  <td style={styles.td}>#{registro.id}</td>
                  <td style={styles.td}>
                    {new Date(registro.fecha_registro).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>Turno {registro.turno}</td>
                  <td style={styles.td}>
                    <strong>{registro.peso_total} kg</strong>
                  </td>
                  <td style={styles.td}>
                    {registro.area_real} - {registro.maquina_real}
                  </td>
                  <td style={styles.td}>{registro.operador?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {registrosPendientes.length === 0 && (
            <div style={styles.emptyState}>
              ✅ No hay registros pendientes de recepción.
            </div>
          )}
        </div>
      </section>

      {/* Recepciones Realizadas */}
      <section style={styles.recepcionesSection}>
        <h2>📋 Recepciones Realizadas ({recepciones.length})</h2>

        {/* Agregar información de debug temporalmente */}
        {recepciones.length === 0 && (
          <div style={styles.debugInfo}>
            <p>ℹ️ No se encontraron recepciones. Posibles causas:</p>
            <ul>
              <li>• No hay recepciones registradas</li>
              <li>• Los filtros aplicados no coinciden con ningún registro</li>
              <li>• El usuario actual no tiene recepciones asignadas</li>
            </ul>
            <button
              onClick={() => setFiltros({
                origen_tipo: '',
                destino: '',
                fecha_inicio: '',
                fecha_fin: ''
              })}
              style={styles.limpiarButton}
            >
              🗑️ Limpiar Filtros
            </button>
          </div>
        )}

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Número HU</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Peso (kg)</th>
                <th style={styles.th}>Material</th>
                <th style={styles.th}>Origen</th>
                <th style={styles.th}>Destino</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recepciones.map(recepcion => (
                <tr key={recepcion.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{recepcion.numero_hu}</strong>
                  </td>
                  <td style={styles.td}>
                    {recepcion.fecha_entrada
                      ? new Date(recepcion.fecha_entrada).toLocaleDateString()
                      : 'N/A'
                    }
                  </td>
                  <td style={styles.td}>
                    <strong>{recepcion.peso_kg || 0} kg</strong>
                  </td>
                  <td style={styles.td}>
                    {(recepcion.tipo_material || '').toUpperCase()}
                  </td>
                  <td style={styles.td}>
                    {getOrigenTipoLabel(recepcion.origen_tipo)}
                    <br />
                    <small>{recepcion.origen_especifico || 'N/A'}</small>
                  </td>
                  <td style={styles.td}>
                    {getDestinoLabel(recepcion.destino)}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleImprimirHU(recepcion.id)}
                      style={styles.imprimirButton}
                      title="Imprimir HU"
                    >
                      🖨️ Imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal para crear nueva recepción */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>🏷️ Nueva Recepción de Scrap</h3>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>📍 Origen del Scrap:</label>
                  <select
                    name="origen_tipo"
                    value={formData.origen_tipo}
                    onChange={handleOrigenTipoChange}
                    style={styles.select}
                    required
                  >
                    <option value="externa">🌐 Externa (Otra planta/proveedor)</option>
                    <option value="interna">🏭 Interna (Producción propia)</option>
                  </select>
                </div>

                {formData.origen_tipo === 'interna' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>📋 Registro Pendiente:</label>
                    <select
                      name="registro_scrap_id"
                      value={formData.registro_scrap_id}
                      onChange={handleInputChange}
                      style={styles.select}
                    >
                      <option value="">Seleccionar registro pendiente (opcional)</option>
                      {registrosPendientes.map(registro => (
                        <option key={registro.id} value={registro.id}>
                          #{registro.id} - {registro.peso_total}kg {registro.tipo_material} - {registro.area_real}
                        </option>
                      ))}
                    </select>
                    {registrosPendientes.length === 0 && formData.origen_tipo === 'interna' && (
                      <p style={styles.warningText}>⚠️ No hay registros pendientes. Puede proceder sin seleccionar uno.</p>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>⚖️ Peso Recibido (kg):</label>
                  <input
                    type="number"
                    name="peso_kg"
                    value={formData.peso_kg}
                    onChange={handleInputChange}
                    style={styles.input}
                    step="0.1"
                    min="0.1"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>📦 Tipo de Material:</label>
                  <div style={styles.comboboxContainer}>
                    <input
                      type="text"
                      name="tipo_material"
                      value={formData.tipo_material}
                      onChange={handleMaterialChange}
                      onFocus={() => setShowMaterialDropdown(true)}
                      onBlur={() => setTimeout(() => setShowMaterialDropdown(false), 200)}
                      style={styles.comboboxInput}
                      placeholder="Selecciona o escribe un nuevo material"
                      required
                    />

                    {showMaterialDropdown && (
                      <div style={styles.dropdown}>
                        {formData.tipo_material && !tiposMaterial.includes(formData.tipo_material) && (
                          <div
                            style={{ ...styles.dropdownItem, ...styles.newMaterialOption }}
                            onMouseDown={() => handleAddNewMaterial(formData.tipo_material)}
                          >
                            ➕ Agregar "{formData.tipo_material}" como nuevo material
                          </div>
                        )}

                        {tiposMaterial.map((material) => (
                          <div
                            key={material}
                            style={{
                              ...styles.dropdownItem,
                              ...(formData.tipo_material === material ? styles.selectedItem : {})
                            }}
                            onMouseDown={() => handleSelectMaterial(material)}
                          >
                            {material.toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {formData.origen_tipo === 'interna' ? '🏭 Origen Específico' : '🏢 Proveedor/Origen Externo'}:
                  </label>
                  <input
                    type="text"
                    name="origen_especifico"
                    value={formData.origen_especifico}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder={
                      formData.origen_tipo === 'interna'
                        ? 'Ej: Planta Norte, Línea 2, etc.'
                        : 'Ej: Proveedor XYZ, Planta Sur, Cliente ABC, etc.'
                    }
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>🎯 Destino:</label>
                  <select
                    name="destino"
                    value={formData.destino}
                    onChange={handleInputChange}
                    style={styles.select}
                    required
                  >
                    <option value="almacenamiento">🏪 Almacenamiento</option>
                    <option value="reciclaje">♻️ Reciclaje</option>
                    <option value="venta">💰 Venta</option>
                  </select>
                </div>
              </div>

              {formData.destino === 'almacenamiento' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>📍 Lugar de Almacenamiento:</label>
                  <input
                    type="text"
                    name="lugar_almacenamiento"
                    value={formData.lugar_almacenamiento}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Ej: Bodega A, Estante 5, etc."
                    required
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>📝 Observaciones:</label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  style={styles.textarea}
                  placeholder="Observaciones adicionales..."
                  rows="3"
                />
              </div>

              <div style={styles.modalActions}>
                <button type="submit" style={styles.submitButton}>
                  🏷️ Generar Recepción y HU
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={styles.cancelButton}
                >
                  ❌ Cancelar
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
    backgroundColor: '#28a745',
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
  destinosSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  destinosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  destinoCard: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '4px',
    textAlign: 'center',
  },
  stockSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  stockGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  debugInfo: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    padding: '1rem',
    marginBottom: '1rem',
    color: '#856404',
  },
  limpiarButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  stockCard: {
    backgroundColor: '#e8f5e8',
    padding: '1rem',
    borderRadius: '4px',
    textAlign: 'center',
    border: '2px solid #28a745',
  },
  stockCantidad: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#28a745',
    margin: '0.5rem 0',
  },
  stockLotes: {
    fontSize: '0.875rem',
    color: '#6c757d',
  },
  filtrosSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  filtrosHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  reporteButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
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
  pendientesSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  recepcionesSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '1rem',
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
    verticalAlign: 'top',
  },
  imprimirButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
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
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
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
  form: {
    padding: '1.5rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1rem',
  },
  label: {
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  comboboxContainer: {
    position: 'relative',
    width: '100%',
  },
  comboboxInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 1000,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '0.75rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: 'white',
    transition: 'background-color 0.2s',
  },
  selectedItem: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  newMaterialOption: {
    backgroundColor: '#e8f5e8',
    fontWeight: 'bold',
    color: '#2d5016',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  submitButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
  },
  warningText: {
    color: '#dc3545',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
    fontStyle: 'italic',
  },
  // Estilos para el reporte
  reporteModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '2rem',
  },
  reporteContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  reporteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #007bff',
    paddingBottom: '1rem',
  },
  reporteBody: {
    marginBottom: '1.5rem',
  },
  totalesSection: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1.5rem',
  },
  totalesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  reporteTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '1.5rem',
  },
  reporteActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
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
};

export default ReceptorDashboard;