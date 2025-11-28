/* src/components/RegistroScrapCompleto.js - VERSIÓN SIN PREGUARDADO */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';
import { useToast } from '../context/ToastContext';

const RegistroScrapCompleto = ({ onRegistroCreado, onCancelar }) => {
  const { addToast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campoBasculaActivo, setCampoBasculaActivo] = useState('peso_cobre_estanado');
  const [enviando, setEnviando] = useState(false);
  const [pesoBloqueado, setPesoBloqueado] = useState(false);

  // Estado para el formulario principal
  const [formData, setFormData] = useState({
    turno: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Estado para los datos de la tabla
  const [tablaData, setTablaData] = useState([]);
  const [celdaActiva, setCeldaActiva] = useState(null);

  // Estado para filtros
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroMaquina, setFiltroMaquina] = useState('');
  const [areasDisponibles, setAreasDisponibles] = useState([]);
  const [maquinasDisponibles, setMaquinasDisponibles] = useState([]);

  const ultimoPesoRef = useRef(null);

  // Cargar configuración
  const loadConfig = useCallback(async () => {
    try {
      console.log('🔧 Cargando configuración...');
      const configData = await apiClient.getRegistrosConfig();
      console.log('📋 Configuración recibida:', configData);
      setConfig(configData);
      
      if (configData?.areas_maquinas) {
        const data = [];
        const areas = [];

        Object.entries(configData.areas_maquinas).forEach(([areaNombre, maquinas]) => {
          areas.push(areaNombre);
          maquinas.forEach(maquina => {
            data.push({
              area_real: areaNombre,
              maquina_real: maquina.maquina_nombre,
              peso_cobre: 0,
              peso_cobre_estanado: 0,
              peso_purga_pvc: 0,
              peso_purga_pe: 0,
              peso_purga_pur: 0,
              peso_purga_pp: 0,
              peso_cable_pvc: 0,
              peso_cable_pe: 0,
              peso_cable_pur: 0,
              peso_cable_pp: 0,
              peso_cable_aluminio: 0,
              peso_cable_estanado_pvc: 0,
              peso_cable_estanado_pe: 0,
              peso_total: 0,
              conexion_bascula: false
            });
          });
        });

        setTablaData(data);
        setAreasDisponibles(areas);
        console.log('📊 Tabla inicializada con', data.length, 'filas');
      }
    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
      addToast('Error cargando configuración: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Filtrar maquinas cuando cambia el área
  useEffect(() => {
    if (!config?.areas_maquinas || !filtroArea) {
      setMaquinasDisponibles([]);
      return;
    }

    const maquinas = config.areas_maquinas[filtroArea]?.map(m => m.maquina_nombre) || [];
    setMaquinasDisponibles(maquinas);

    if (maquinas.length === 1) {
      setFiltroMaquina(maquinas[0]);
    } else {
      setFiltroMaquina('');
    }
  }, [filtroArea, config]);

  // Manejar peso desde báscula
  const handlePesoFromBascula = useCallback((peso, campo = campoBasculaActivo) => {
    if (pesoBloqueado) {
      console.log('⏸️ Peso bloqueado, no se actualiza');
      return;
    }

    if (!campo || peso === undefined || peso === null) {
      console.warn('❌ No hay campo activo o peso inválido:', { campo, peso });
      return;
    }

    console.log('🎯 Asignando peso:', { peso, campo, celdaActiva });

    // Si tenemos una celda activa específica, actualizar esa
    if (celdaActiva && celdaActiva.areaIndex !== undefined) {
      const { areaIndex } = celdaActiva;

      setTablaData(prev => {
        const newData = [...prev];
        if (newData[areaIndex]) {
          const nuevoValor = parseFloat(peso) || 0;
          newData[areaIndex] = {
            ...newData[areaIndex],
            [campo]: nuevoValor,
            conexion_bascula: nuevoValor > 0,
            peso_total: calcularTotalFila({ ...newData[areaIndex], [campo]: nuevoValor })
          };
        }
        return newData;
      });

      if (peso > 0) {
        addToast(`✅ Peso ${peso}kg asignado a ${campo}`, 'success');
      }
    }
    // Si no hay celda activa pero tenemos filtros de área/máquina, actualizar esa fila
    else if (filtroArea && filtroMaquina) {
      const index = tablaData.findIndex(fila =>
        fila.area_real === filtroArea && fila.maquina_real === filtroMaquina
      );

      if (index !== -1) {
        setTablaData(prev => {
          const newData = [...prev];
          const nuevoValor = parseFloat(peso) || 0;
          newData[index] = {
            ...newData[index],
            [campo]: nuevoValor,
            conexion_bascula: nuevoValor > 0,
            peso_total: calcularTotalFila({ ...newData[index], [campo]: nuevoValor })
          };
          return newData;
        });

        setCeldaActiva({ areaIndex: index, campo });
        if (peso > 0) {
          addToast(`✅ Peso ${peso}kg asignado a ${campo} en ${filtroMaquina}`, 'success');
        }
      }
    }
    else {
      addToast('⚠️ Selecciona un área y máquina primero', 'warning');
    }

    ultimoPesoRef.current = peso;
  }, [pesoBloqueado, celdaActiva, campoBasculaActivo, addToast, tablaData, filtroArea, filtroMaquina]);

  // Calcular total por fila
  const calcularTotalFila = (fila) => {
    const camposPeso = [
      'peso_cobre', 'peso_cobre_estanado', 'peso_purga_pvc', 'peso_purga_pe',
      'peso_purga_pur', 'peso_purga_pp', 'peso_cable_pvc', 'peso_cable_pe',
      'peso_cable_pur', 'peso_cable_pp', 'peso_cable_aluminio',
      'peso_cable_estanado_pvc', 'peso_cable_estanado_pe'
    ];
    return camposPeso.reduce((total, campo) => total + (parseFloat(fila[campo]) || 0), 0);
  };

  // Manejar cambio manual de input en tabla
  const handleInputChangeTabla = (areaIndex, campo, valor) => {
    setTablaData(prev => {
      const newData = [...prev];
      newData[areaIndex] = {
        ...newData[areaIndex],
        [campo]: parseFloat(valor) || 0,
        peso_total: calcularTotalFila({ ...newData[areaIndex], [campo]: parseFloat(valor) || 0 })
      };
      return newData;
    });
  };

  // Activar celda para báscula
  const activarCeldaParaBascula = (areaIndex, campo) => {
    setCeldaActiva({ areaIndex, campo });
    setCampoBasculaActivo(campo);
  };

  // Enviar todos los registros
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.turno) {
      addToast('Seleccione el turno', 'warning');
      return;
    }

    const filasConPeso = tablaData.filter(fila =>
      Object.keys(fila).some(k => k.startsWith('peso_') && parseFloat(fila[k]) > 0)
    );

    if (filasConPeso.length === 0) {
      addToast('Ingrese al menos un peso en alguna fila', 'warning');
      return;
    }

    setEnviando(true);
    try {
      const promises = filasConPeso.map(fila => {
        const datosEnvio = {
          turno: formData.turno,
          area_real: fila.area_real,
          maquina_real: fila.maquina_real,
          conexion_bascula: fila.conexion_bascula || false,
          numero_lote: `LOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          observaciones: 'Registro múltiple desde tabla',
          material_seleccionado: campoBasculaActivo,
          peso_actual: fila[campoBasculaActivo] || 0,
          ...fila
        };
        return apiClient.createRegistroScrap(datosEnvio);
      });

      const resultados = await Promise.all(promises);
      addToast(`${resultados.length} registros guardados exitosamente`, 'success');

      if (onRegistroCreado) {
        onRegistroCreado();
      }

    } catch (error) {
      console.error('❌ Error guardando registros:', error);
      addToast('Error al guardar registros: ' + error.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  // Calcular totales por columna
  const calcularTotalesColumnas = () => {
    const totales = {};
    const camposPeso = [
      'peso_cobre', 'peso_cobre_estanado', 'peso_purga_pvc', 'peso_purga_pe',
      'peso_purga_pur', 'peso_purga_pp', 'peso_cable_pvc', 'peso_cable_pe',
      'peso_cable_pur', 'peso_cable_pp', 'peso_cable_aluminio',
      'peso_cable_estanado_pvc', 'peso_cable_estanado_pe'
    ];

    camposPeso.forEach(campo => {
      totales[campo] = tablaData.reduce((sum, fila) => sum + (parseFloat(fila[campo]) || 0), 0);
    });

    totales.general = tablaData.reduce((sum, fila) => sum + (parseFloat(fila.peso_total) || 0), 0);
    return totales;
  };

  // Filtrar datos para mostrar
  const datosFiltrados = tablaData.filter(fila => {
    if (filtroArea && fila.area_real !== filtroArea) return false;
    if (filtroMaquina && fila.maquina_real !== filtroMaquina) return false;
    return true;
  });

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <p>Cargando configuración de máquinas...</p>
    </div>
  );

  const totales = calcularTotalesColumnas();
  const tiposScrap = config?.tipos_scrap ? Object.values(config.tipos_scrap).flat() : [];
  const filasConPeso = tablaData.filter(fila => fila.peso_total > 0).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Registro Completo de Scrap</h1>
        <p style={styles.subtitle}>Complete los datos de producción para todas las máquinas</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>

        {/* CONTROLES PRINCIPALES */}
        <div style={styles.controls}>
          {/* Báscula */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>⚖️ Control de Báscula</h3>
            <BasculaConnection
              onPesoObtenido={handlePesoFromBascula}
              campoDestino={campoBasculaActivo}
            />
          </div>

          {/* Configuración */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📋 Datos de la Jornada</h3>
            <div style={styles.configGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Fecha:</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Turno:</label>
                <select
                  value={formData.turno}
                  onChange={(e) => setFormData(prev => ({ ...prev, turno: e.target.value }))}
                  style={styles.select}
                  required
                >
                  <option value="">Seleccionar turno...</option>
                  <option value="1">Turno 1</option>
                  <option value="2">Turno 2</option>
                  <option value="3">Turno 3</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Tipo de Scrap:</label>
                <select
                  value={campoBasculaActivo}
                  onChange={(e) => setCampoBasculaActivo(e.target.value)}
                  style={{ ...styles.select, borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}
                >
                  {tiposScrap.map(t => (
                    <option key={t.columna_db} value={t.columna_db}>
                      {t.tipo_nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtros */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Área:</label>
                <select
                  value={filtroArea}
                  onChange={(e) => setFiltroArea(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Todas las áreas</option>
                  {areasDisponibles.map(area =>
                    <option key={area} value={area}>{area}</option>
                  )}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Máquina:</label>
                <select
                  value={filtroMaquina}
                  onChange={(e) => setFiltroMaquina(e.target.value)}
                  style={styles.select}
                  disabled={!filtroArea}
                >
                  <option value="">Todas las máquinas</option>
                  {maquinasDisponibles.map(maquina =>
                    <option key={maquina} value={maquina}>{maquina}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Indicador de Máquina Activa */}
            {celdaActiva && (
              <div style={styles.activeMachine}>
                <div style={styles.activeMachineHeader}>
                  <span style={styles.activeMachineIcon}>🎯</span>
                  <strong style={styles.activeMachineTitle}>Máquina Activa</strong>
                </div>
                <div style={styles.activeMachineDetails}>
                  <span style={styles.activeMachineText}>
                    {tablaData[celdaActiva.areaIndex]?.maquina_real}
                  </span>
                  <span style={styles.activeMachineSubtext}>
                    {campoBasculaActivo}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABLA DE DATOS */}
        <div style={styles.dataSection}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>📊 Datos de Producción</h3>
            <div style={styles.stats}>
              <span>Máquinas: <strong>{datosFiltrados.length}</strong></span>
              <span>Con datos: <strong>{filasConPeso}</strong></span>
              <span>Total: <strong>{totales.general.toFixed(3)} kg</strong></span>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeaderCell}>ÁREA</th>
                  <th style={styles.tableHeaderCell}>MÁQUINA</th>
                  {tiposScrap.map(tipo => (
                    <th key={tipo.columna_db} style={styles.tableHeaderCell}>
                      {tipo.tipo_nombre}
                    </th>
                  ))}
                  <th style={styles.tableHeaderCell}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((fila, index) => {
                  const realIndex = tablaData.findIndex(item =>
                    item.area_real === fila.area_real && item.maquina_real === fila.maquina_real
                  );
                  const estaActiva = celdaActiva?.areaIndex === realIndex;

                  return (
                    <tr key={`${fila.area_real}-${fila.maquina_real}`} style={estaActiva ? styles.activeRow : {}}>
                      <td style={styles.tableCell}>{fila.area_real}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.machineCell}>
                          {fila.maquina_real}
                          {estaActiva && <span style={styles.activeIndicator}>🎯</span>}
                        </div>
                      </td>

                      {tiposScrap.map(tipo => {
                        const valor = fila[tipo.columna_db];
                        const celdaEstaActiva = estaActiva && campoBasculaActivo === tipo.columna_db;

                        return (
                          <td key={tipo.columna_db} style={styles.tableCell}>
                            <input
                              type="number"
                              step="0.001"
                              value={valor || ''}
                              onChange={(e) => handleInputChangeTabla(realIndex, tipo.columna_db, e.target.value)}
                              onFocus={() => activarCeldaParaBascula(realIndex, tipo.columna_db)}
                              style={{
                                ...styles.inputCell,
                                ...(valor > 0 ? styles.hasData : {}),
                                ...(celdaEstaActiva ? styles.activeInput : {})
                              }}
                              placeholder="0.0"
                            />
                          </td>
                        );
                      })}

                      <td style={styles.totalCell}>
                        <strong>{fila.peso_total.toFixed(3)}</strong>
                      </td>
                    </tr>
                  );
                })}

                {/* Totales */}
                <tr style={styles.totalRow}>
                  <td style={styles.totalCell} colSpan="2">
                    <strong>TOTAL GENERAL</strong>
                  </td>
                  {tiposScrap.map(tipo => (
                    <td key={tipo.columna_db} style={styles.totalCell}>
                      <strong>{totales[tipo.columna_db].toFixed(3)}</strong>
                    </td>
                  ))}
                  <td style={styles.grandTotalCell}>
                    <strong>{totales.general.toFixed(3)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ACCIONES */}
        <div style={styles.actions}>
          <div style={styles.summary}>
            <span>
              📋 <strong>{filasConPeso}</strong> registros listos | 
              Total: <strong>{totales.general.toFixed(3)} kg</strong>
            </span>
          </div>
          <div style={styles.actionButtons}>
            <button
              type="button"
              onClick={onCancelar}
              style={styles.btnCancel}
            >
              ❌ Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !formData.turno || filasConPeso === 0}
              style={{
                ...styles.btnSave,
                ...(enviando || !formData.turno || filasConPeso === 0 ? styles.btnDisabled : {})
              }}
            >
              {enviando ? '⏳ Guardando...' : `💾 Guardar ${filasConPeso} Registros`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ESTILOS (sin cambios, se mantienen igual)
const styles = {
  container: {
    padding: '1rem',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0.5rem 0 0 0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    textAlign: 'center',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  controls: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    alignItems: 'start'
  },
  section: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem'
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: 'white'
  },
  activeMachine: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    borderRadius: '6px'
  },
  activeMachineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  activeMachineIcon: {
    fontSize: '1.2rem'
  },
  activeMachineTitle: {
    color: '#0369a1',
    fontSize: '0.9rem'
  },
  activeMachineDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  activeMachineText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: '1rem'
  },
  activeMachineSubtext: {
    color: '#64748b',
    fontSize: '0.8rem',
    fontStyle: 'italic'
  },
  dataSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  stats: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.875rem',
    color: '#64748b'
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '6px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px'
  },
  tableHeaderCell: {
    backgroundColor: '#1e293b',
    color: 'white',
    padding: '0.75rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    textAlign: 'center',
    border: '1px solid #334155'
  },
  tableCell: {
    padding: '0.5rem',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    fontSize: '0.875rem'
  },
  machineCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: '600'
  },
  inputCell: {
    width: '100%',
    padding: '0.375rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    textAlign: 'right',
    fontSize: '0.875rem'
  },
  hasData: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0'
  },
  activeInput: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
  },
  activeRow: {
    backgroundColor: '#fffbeb'
  },
  activeIndicator: {
    fontSize: '0.75rem'
  },
  totalCell: {
    padding: '0.75rem',
    backgroundColor: '#f8fafc',
    fontWeight: '600',
    textAlign: 'center'
  },
  totalRow: {
    backgroundColor: '#1e40af',
    color: 'white'
  },
  grandTotalCell: {
    padding: '0.75rem',
    backgroundColor: '#1e40af',
    color: 'white',
    fontWeight: '700',
    textAlign: 'center'
  },
  actions: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summary: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#374151'
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem'
  },
  btnCancel: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f8fafc',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnSave: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  }
};

// Agregar animación para el spinner
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

export default RegistroScrapCompleto;