/* src/pages/ReceptorDashboard.js - VERSIÓN MEJORADA CON FILTROS SIMPLIFICADOS */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const ReceptorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);

  // Filtros simplificados - solo fecha específica
  const [filtros, setFiltros] = useState({
    tipo_material: '',
    origen_tipo: '',
    destino: '',
    fecha: new Date().toISOString().split('T')[0] // Solo un campo de fecha
  });

  // Formulario simplificado
  const [formData, setFormData] = useState({
    peso_kg: '',
    tipo_material: '',
    origen_tipo: 'externa',
    origen_especifico: '',
    destino: 'almacenamiento'
  });

  const [tiposMaterial, setTiposMaterial] = useState([]);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const modalRef = useRef(null);

  // Cargar datos iniciales
  const loadReceptorData = useCallback(async () => {
    setLoading(true);
    try {
      // Convertir el filtro de fecha única a fecha_desde y fecha_hasta para la API
      const filtrosApi = {
        ...filtros,
        fecha_desde: filtros.fecha,
        fecha_hasta: filtros.fecha
      };

      const [recepcionesData, stockData, tiposData] = await Promise.all([
        apiClient.getRecepcionesScrap(filtrosApi),
        apiClient.getTiposMaterial()
      ]);

      setRecepciones(Array.isArray(recepcionesData) ? recepcionesData : []);
      setTiposMaterial(tiposData || ['cobre', 'aluminio', 'mixto', 'cobre_estanado']);

    } catch (error) {
      addToast('Error al cargar datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filtros, addToast]);

  useEffect(() => {
    loadReceptorData();
  }, [loadReceptorData]);

  // Manejar tecla ESC para cerrar modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  // Clic fuera del modal para cerrar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && showModal) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal]);

  // Manejar cambios en filtros
  const handleFiltroChange = (e) => {
    setFiltros(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Seleccionar material del dropdown
  const handleSelectMaterial = (material) => {
    setFormData(prev => ({
      ...prev,
      tipo_material: material
    }));
    setShowMaterialDropdown(false);
  };

  // Agregar nuevo material (si el usuario escribe uno nuevo)
  const handleAddNewMaterial = () => {
    const nuevoMaterial = formData.tipo_material.trim();
    if (nuevoMaterial && !tiposMaterial.includes(nuevoMaterial)) {
      setTiposMaterial(prev => [...prev, nuevoMaterial]);
      addToast(`Material "${nuevoMaterial}" agregado a la lista`, 'success');
    }
    setShowMaterialDropdown(false);
  };

  // Limpiar todos los filtros
  const handleLimpiarFiltros = () => {
    setFiltros({
      tipo_material: '',
      origen_tipo: '',
      destino: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    addToast('Filtros limpiados', 'info');
  };

  // Imprimir etiqueta PDF
  const handleImprimirEtiqueta = async (id, numeroHu) => {
    try {
      addToast(`🖨️ Generando etiqueta HU-${numeroHu}...`, 'info');

      const blob = await apiClient.imprimirEtiquetaPdf(id);
      const blobUrl = window.URL.createObjectURL(blob);

      // Abrir en nueva pestaña
      window.open(blobUrl, '_blank');

      addToast(`✅ Etiqueta HU-${numeroHu} generada`, 'success');

    } catch (error) {
      console.error('Error al imprimir etiqueta:', error);
      addToast('❌ Error al generar la etiqueta: ' + error.message, 'error');
    }
  };

  // Descargar etiqueta PDF
  const handleDescargarEtiqueta = async (id, numeroHu) => {
    try {
      await apiClient.descargarEtiquetaPdf(id, `etiqueta-HU-${numeroHu}.pdf`);
      addToast(`📥 Etiqueta HU-${numeroHu} descargada`, 'success');
    } catch (error) {
      console.error('Error al descargar etiqueta:', error);
      addToast('❌ Error al descargar la etiqueta: ' + error.message, 'error');
    }
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica
    if (!formData.peso_kg || parseFloat(formData.peso_kg) <= 0) {
      addToast('❌ Ingrese un peso válido mayor a 0', 'error');
      return;
    }

    if (!formData.tipo_material) {
      addToast('❌ Seleccione o ingrese un tipo de material', 'error');
      return;
    }

    setModalLoading(true);

    try {
      const response = await apiClient.createRecepcionScrap(formData);

      addToast(`✅ Recepción creada! HU: ${response.numero_hu}`, 'success');

      // Cerrar modal y limpiar formulario
      setShowModal(false);
      setFormData({
        peso_kg: '',
        tipo_material: '',
        origen_tipo: 'externa',
        origen_especifico: '',
        destino: 'almacenamiento'
      });

      // Recargar datos
      loadReceptorData();

    } catch (error) {
      addToast('❌ Error al crear recepción: ' + error.message, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Calcular totales
  const calcularTotales = () => {
    const totalPeso = recepciones.reduce((sum, r) => sum + (parseFloat(r.peso_kg) || 0), 0);
    const recepcionesExternas = recepciones.filter(r => r.origen_tipo === 'externa').length;
    const recepcionesInternas = recepciones.filter(r => r.origen_tipo === 'interna').length;

    return {
      totalPeso: totalPeso.toFixed(2),
      recepcionesExternas,
      recepcionesInternas
    };
  };

  // Formatear material para display
  const formatearMaterial = (material) => {
    return material
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p>Cargando dashboard receptor...</p>
        </div>
      </div>
    );
  }

  const totales = calcularTotales();

  return (
    <div style={styles.container}>
      {/* HEADER SIMPLIFICADO - SIN CARD */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <h1 style={styles.title}>Dashboard Receptor</h1>
          <p style={styles.subtitle}>Hola, {user.name} 👋 • {recepciones.length} recepciones hoy</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => loadReceptorData()} style={styles.secondaryButton}>
            🔄 Actualizar
          </button>
          <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
            ➕ Nueva Recepción
          </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div style={styles.statsCards}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{totales.totalPeso} kg</h3>
            <p style={styles.statLabel}>Peso Total</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🌐</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{totales.recepcionesExternas}</h3>
            <p style={styles.statLabel}>Recep. Externas</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🏭</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{totales.recepcionesInternas}</h3>
            <p style={styles.statLabel}>Recep. Internas</p>
          </div>
        </div>
      </div>

      {/* FILTROS SIMPLIFICADOS - SOLO UN CALENDARIO */}
      <div style={styles.filtersSection}>
        <div style={styles.filtersHeader}>
          <h3 style={styles.sectionTitle}>🎛️ Filtros de Recepciones</h3>
          <div style={styles.filtersActions}>
            <button onClick={handleLimpiarFiltros} style={styles.filterClearButton}>
              🗑️ Limpiar Filtros
            </button>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          {/* Filtro de fecha - solo un calendario */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>📅 Fecha de Recepción</label>
            <div style={styles.dateFilterContainer}>
              <input
                type="date"
                name="fecha"
                value={filtros.fecha}
                onChange={handleFiltroChange}
                style={styles.dateInput}
              />
              <span style={styles.dateHelper}>
                {new Date(filtros.fecha).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>🏷️ Tipo de Material</label>
            <select
              name="tipo_material"
              value={filtros.tipo_material}
              onChange={handleFiltroChange}
              style={styles.select}
            >
              <option value="">Todos los materiales</option>
              {tiposMaterial.map(tipo => (
                <option key={tipo} value={tipo}>
                  {formatearMaterial(tipo)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>📍 Origen</label>
            <select
              name="origen_tipo"
              value={filtros.origen_tipo}
              onChange={handleFiltroChange}
              style={styles.select}
            >
              <option value="">Todos los orígenes</option>
              <option value="externa">🌐 Externa</option>
              <option value="interna">🏭 Interna</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>🎯 Destino</label>
            <select
              name="destino"
              value={filtros.destino}
              onChange={handleFiltroChange}
              style={styles.select}
            >
              <option value="">Todos los destinos</option>
              <option value="almacenamiento">📦 Almacenamiento</option>
              <option value="reciclaje">♻️ Reciclaje</option>
              <option value="venta">💰 Venta</option>
            </select>
          </div>
        </div>

        {/* Indicador de filtros activos */}
        {Object.values(filtros).some(val => val && val !== new Date().toISOString().split('T')[0]) && (
          <div style={styles.activeFilters}>
            <span style={styles.activeFiltersLabel}>Filtros activos:</span>
            {filtros.tipo_material && (
              <span style={styles.filterBadge}>
                Material: {formatearMaterial(filtros.tipo_material)}
              </span>
            )}
            {filtros.origen_tipo && (
              <span style={styles.filterBadge}>
                Origen: {filtros.origen_tipo === 'interna' ? '🏭 Interna' : '🌐 Externa'}
              </span>
            )}
            {filtros.destino && (
              <span style={styles.filterBadge}>
                Destino: {filtros.destino === 'almacenamiento' ? '📦 Almacen' :
                  filtros.destino === 'reciclaje' ? '♻️ Reciclaje' : '💰 Venta'}
              </span>
            )}
            <span style={styles.filterBadge}>
              Fecha: {new Date(filtros.fecha).toLocaleDateString('es-ES')}
            </span>
          </div>
        )}
      </div>

      {/* TABLA DE RECEPCIONES */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>📋 Historial de Recepciones</h3>
            <p style={styles.cardSubtitle}>
              {recepciones.length} recepciones encontradas • {totales.totalPeso} kg total
            </p>
          </div>
        </div>

        <div style={styles.tableContainer}>
          {recepciones.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>HU</th>
                  <th style={styles.th}>Fecha y Hora</th>
                  <th style={styles.th}>Material</th>
                  <th style={styles.th}>Peso (kg)</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Destino</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recepciones.map((r) => (
                  <tr
                    key={r.id}
                    style={{
                      ...styles.tr,
                      ...(r.origen_tipo === 'interna' ? styles.internaRow : styles.externaRow)
                    }}
                  >
                    <td style={styles.td}>
                      <strong style={styles.huCode}>HU-{r.numero_hu}</strong>
                    </td>
                    <td style={styles.td}>
                      {new Date(r.fecha_entrada).toLocaleDateString('es-ES')}
                      <br />
                      <small style={styles.timeText}>
                        {new Date(r.fecha_entrada).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </small>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.materialBadge}>
                        {formatearMaterial(r.tipo_material)}
                      </span>
                    </td>
                    <td style={{ ...styles.td, ...styles.numericCell }}>
                      <strong>{parseFloat(r.peso_kg || 0).toFixed(2)}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={r.origen_tipo === 'interna' ? styles.origenInternaBadge : styles.origenExternaBadge}>
                        {r.origen_tipo === 'interna' ? '🏭 Interna' : '🌐 Externa'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.destinoBadge}>
                        {r.destino === 'almacenamiento' ? '📦 Almacen' :
                          r.destino === 'reciclaje' ? '♻️ Reciclaje' : '💰 Venta'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleImprimirEtiqueta(r.id, r.numero_hu)}
                          style={styles.actionPrintButton}
                          title="Imprimir Etiqueta"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={() => handleDescargarEtiqueta(r.id, r.numero_hu)}
                          style={styles.actionDownloadButton}
                          title="Descargar PDF"
                        >
                          📥
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>📭</div>
              <h3 style={styles.emptyStateText}>No hay recepciones</h3>
              <p style={styles.emptyStateSubtext}>
                No se encontraron recepciones con los filtros seleccionados
              </p>
              <button
                onClick={() => setShowModal(true)}
                style={styles.primaryButton}
              >
                ➕ Crear Primera Recepción
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL MEJORADO (sin cambios) */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div ref={modalRef} style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Nueva Recepción de Material</h3>
                <p style={styles.modalSubtitle}>Complete los datos de la recepción</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
                aria-label="Cerrar modal"
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <div style={styles.modalContent}>
              {modalLoading && (
                <div style={styles.modalLoading}>
                  <div style={styles.modalSpinner}></div>
                  <p style={styles.modalLoadingText}>Creando recepción...</p>
                </div>
              )}

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGrid}>
                  {/* Columna izquierda */}
                  <div style={styles.formColumn}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>
                        <span style={styles.labelRequired}>*</span> Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="peso_kg"
                        value={formData.peso_kg}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                        placeholder="0.000"
                        min="0.001"
                        autoFocus
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>
                        <span style={styles.labelRequired}>*</span> Origen
                      </label>
                      <select
                        name="origen_tipo"
                        value={formData.origen_tipo}
                        onChange={handleInputChange}
                        style={styles.select}
                        required
                      >
                        <option value="externa">🌐 Externa</option>
                        <option value="interna">🏭 Interna</option>
                      </select>
                    </div>
                  </div>

                  {/* Columna derecha */}
                  <div style={styles.formColumn}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>
                        <span style={styles.labelRequired}>*</span> Tipo de Material
                      </label>
                      <div style={styles.inputWithDropdown}>
                        <select
                          name="tipo_material"
                          value={formData.tipo_material}
                          onChange={handleInputChange}
                          style={styles.select}
                          required
                          onFocus={() => setShowMaterialDropdown(true)}
                          onBlur={() => setTimeout(() => setShowMaterialDropdown(false), 200)}
                        >
                          <option value="">Seleccionar material...</option>
                          {tiposMaterial.map(material => (
                            <option key={material} value={material}>
                              {formatearMaterial(material)}
                            </option>
                          ))}
                        </select>

                        {/* Input opcional para nuevo material */}
                        <div style={styles.newMaterialContainer}>
                          <input
                            type="text"
                            name="nuevo_material"
                            value={formData.tipo_material}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                tipo_material: value.toLowerCase().replace(/\s+/g, '_')
                              }));
                            }}
                            style={styles.input}
                            placeholder="O escribir nuevo material..."
                            onFocus={() => setShowMaterialDropdown(false)}
                          />
                          {formData.tipo_material && !tiposMaterial.includes(formData.tipo_material) && (
                            <button
                              type="button"
                              onClick={handleAddNewMaterial}
                              style={styles.addNewButton}
                            >
                              + Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>
                        <span style={styles.labelRequired}>*</span> Destino
                      </label>
                      <select
                        name="destino"
                        value={formData.destino}
                        onChange={handleInputChange}
                        style={styles.select}
                        required
                      >
                        <option value="almacenamiento">📦 Almacenamiento</option>
                        <option value="reciclaje">♻️ Reciclaje</option>
                        <option value="venta">💰 Venta</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Origen específico (solo para origen externo) */}
                {formData.origen_tipo === 'externa' && (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Origen Específico (opcional)</label>
                    <input
                      type="text"
                      name="origen_especifico"
                      value={formData.origen_especifico}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="Ej: Proveedor ABC, Transporte XYZ..."
                    />
                  </div>
                )}

                <div style={styles.formSummary}>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Material:</span>
                    <span style={styles.summaryValue}>
                      {formData.tipo_material ? formatearMaterial(formData.tipo_material) : '—'}
                    </span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Peso:</span>
                    <span style={styles.summaryValue}>
                      {formData.peso_kg ? `${parseFloat(formData.peso_kg).toFixed(3)} kg` : '—'}
                    </span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Destino:</span>
                    <span style={styles.summaryValue}>
                      {formData.destino === 'almacenamiento' ? '📦 Almacenamiento' :
                        formData.destino === 'reciclaje' ? '♻️ Reciclaje' : '💰 Venta'}
                    </span>
                  </div>
                </div>

                <div style={styles.modalFooter}>
                  <div style={styles.modalActions}>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      style={styles.btnCancel}
                      disabled={modalLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        ...styles.btnSave,
                        ...(modalLoading ? styles.btnLoading : {})
                      }}
                      disabled={modalLoading || !formData.peso_kg || !formData.tipo_material}
                    >
                      {modalLoading ? (
                        <>
                          <div style={styles.loadingSpinner}></div>
                          Guardando...
                        </>
                      ) : (
                        '💾 Crear Recepción'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ESTILOS MEJORADOS CON NUEVOS COMPONENTES
const styles = {
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    minHeight: '100vh',
    fontFamily: typography.fontFamily
  },

  // HEADER MEJORADO
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottom: `2px solid ${colors.gray200}`,
    flexWrap: 'wrap',
    gap: spacing.md
  },

  headerInfo: {
    flex: 1
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
    fontSize: typography.sizes.base,
    margin: `${spacing.xs} 0 0 0`,
    fontWeight: typography.weights.medium
  },

  headerActions: {
    display: 'flex',
    gap: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  primaryButton: {
    ...baseComponents.buttonPrimary,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.lg}`,
    height: '42px',
    fontSize: typography.sizes.sm
  },

  secondaryButton: {
    ...baseComponents.buttonSecondary,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.lg}`,
    height: '42px',
    fontSize: typography.sizes.sm
  },

  // TARJETAS DE ESTADÍSTICAS
  statsCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: spacing.md,
    marginBottom: spacing.lg
  },

  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    border: `1px solid ${colors.gray200}`,
    boxShadow: shadows.sm,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: shadows.md
    }
  },

  statIcon: {
    fontSize: '2rem',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: radius.lg,
    color: colors.primary
  },

  statContent: {
    flex: 1
  },

  statValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.gray900,
    margin: 0,
    lineHeight: 1.2
  },

  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray600,
    margin: `${spacing.xs} 0 0 0`,
    fontWeight: typography.weights.medium
  },

  // FILTROS SIMPLIFICADOS
  filtersSection: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    border: `1px solid ${colors.gray200}`
  },

  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm
  },

  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray800,
    margin: 0
  },

  filtersActions: {
    display: 'flex',
    gap: spacing.sm
  },

  filterClearButton: {
    ...baseComponents.buttonSecondary,
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.sizes.sm,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.md
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },

  filterLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs
  },

  // ESPECIAL PARA EL FILTRO DE FECHA
  dateFilterContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },

  dateInput: {
    ...baseComponents.input,
    padding: `0 ${spacing.sm}`,
    height: '40px',
    fontSize: typography.sizes.sm,
    lineHeight: '40px',
    backgroundColor: colors.surface,
    borderColor: colors.gray300
  },

  dateHelper: {
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    fontStyle: 'italic',
    paddingLeft: spacing.xs
  },

  select: {
    ...baseComponents.select,
    padding: `0 ${spacing.sm}`,
    height: '40px',
    fontSize: typography.sizes.sm,
    lineHeight: '40px',
    backgroundColor: colors.surface,
    borderColor: colors.gray300
  },

  // INDICADOR DE FILTROS ACTIVOS
  activeFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    border: `1px solid ${colors.primary}30`,
    marginTop: spacing.md
  },

  activeFiltersLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    display: 'flex',
    alignItems: 'center'
  },

  filterBadge: {
    backgroundColor: colors.surface,
    color: colors.gray700,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    border: `1px solid ${colors.gray300}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs
  },

  // TABLA Y COMPONENTES EXISTENTES (manteniendo los estilos anteriores)
  card: {
    ...baseComponents.card,
    overflow: 'hidden',
    marginBottom: spacing.lg
  },

  cardHeader: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.gray200}`,
    backgroundColor: colors.gray50,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md
  },

  cardTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.gray800,
    margin: 0
  },

  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray600,
    marginTop: spacing.xs
  },

  tableContainer: {
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px'
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

  internaRow: {
    backgroundColor: colors.primaryLight + '20',
    borderLeft: `3px solid ${colors.primary}`
  },

  externaRow: {
    backgroundColor: colors.success + '10',
    borderLeft: `3px solid ${colors.success}`
  },

  td: {
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.gray700,
    borderBottom: `1px solid ${colors.gray200}`,
    whiteSpace: 'nowrap'
  },

  timeText: {
    fontSize: typography.sizes.xs,
    color: colors.gray500
  },

  numericCell: {
    textAlign: 'right',
    fontFamily: typography.fontMono,
    fontWeight: typography.weights.medium
  },

  huCode: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    backgroundColor: colors.primaryLight,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    display: 'inline-block'
  },

  materialBadge: {
    backgroundColor: colors.secondaryLight,
    color: colors.secondary,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs
  },

  origenInternaBadge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs
  },

  origenExternaBadge: {
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

  destinoBadge: {
    backgroundColor: colors.gray200,
    color: colors.gray700,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold
  },

  actions: {
    display: 'flex',
    gap: spacing.xs
  },

  actionPrintButton: {
    ...baseComponents.buttonPrimary,
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: '1rem',
    minWidth: 'auto',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  actionDownloadButton: {
    ...baseComponents.buttonSecondary,
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: '1rem',
    minWidth: 'auto',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // MODAL Y ESTILOS RESTANTES (sin cambios del código original)
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
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: shadows.xl,
    border: `1px solid ${colors.gray200}`,
    display: 'flex',
    flexDirection: 'column'
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
    margin: 0
  },

  modalSubtitle: {
    fontSize: typography.sizes.lg,
    color: colors.gray600,
    margin: `${spacing.xs} 0 0 0`
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

  modalContent: {
    flex: 1,
    overflow: 'auto',
    padding: 0,
    position: 'relative'
  },

  form: {
    padding: spacing.lg
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg,
    marginBottom: spacing.lg
  },

  formColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md
  },

  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },

  label: {
    display: 'block',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray700,
    marginBottom: spacing.xs
  },

  labelRequired: {
    color: colors.error,
    marginRight: '2px'
  },

  input: {
    ...baseComponents.input,
    padding: `0 ${spacing.sm}`,
    height: '40px',
    fontSize: typography.sizes.sm,
    lineHeight: '40px'
  },

  inputWithDropdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },

  newMaterialContainer: {
    display: 'flex',
    gap: spacing.xs,
    marginTop: spacing.xs
  },

  addNewButton: {
    ...baseComponents.buttonSecondary,
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.sizes.sm,
    whiteSpace: 'nowrap'
  },

  formSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.lg,
    margin: `${spacing.lg} 0`,
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    border: `1px solid ${colors.gray200}`
  },

  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },

  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray600,
    fontWeight: typography.weights.semibold
  },

  summaryValue: {
    fontSize: typography.sizes.base,
    color: colors.gray800,
    fontWeight: typography.weights.bold
  },

  modalFooter: {
    paddingTop: spacing.lg,
    borderTop: `1px solid ${colors.gray200}`
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.md
  },

  btnCancel: {
    ...baseComponents.buttonSecondary,
    padding: `${spacing.sm} ${spacing.lg}`,
    height: '42px',
    minWidth: '140px'
  },

  btnSave: {
    ...baseComponents.buttonPrimary,
    padding: `${spacing.sm} ${spacing.lg}`,
    height: '42px',
    minWidth: '180px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },

  btnLoading: {
    backgroundColor: colors.primary,
    cursor: 'wait'
  },

  loadingSpinner: {
    width: '16px',
    height: '16px',
    border: `2px solid ${colors.surface}40`,
    borderTop: `2px solid ${colors.surface}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
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
  }
};

// Agregar animación del spinner
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

export default ReceptorDashboard;