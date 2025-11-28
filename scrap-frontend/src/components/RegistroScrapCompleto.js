/* src/components/RegistroScrapCompleto.js - VERSIÓN SIN PREGUARDADO */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';
import { useToast } from '../context/ToastContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const RegistroScrapCompleto = ({ onRegistroCreado, onCancelar, onLoadComplete }) => {
  const { addToast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campoBasculaActivo, setCampoBasculaActivo] = useState('peso_cobre');
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
      // ✅ NOTIFICAR QUE LA CARGA HA TERMINADO
      if (onLoadComplete) {
        onLoadComplete();
      }
    }
  }, [addToast, onLoadComplete]); // ✅ AGREGAR onLoadComplete A LAS DEPENDENCIAS

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

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Cargando configuración de máquinas...</p>
      </div>
    );
  }

  const totales = calcularTotalesColumnas();
  const tiposScrap = config?.tipos_scrap ? Object.values(config.tipos_scrap).flat() : [];
  const filasConPeso = tablaData.filter(fila => fila.peso_total > 0).length;

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* CONTROLES PRINCIPALES - CORREGIDOS */}
        <div style={styles.controls}>
          {/* Báscula */}
          <div style={styles.section}>
            <BasculaConnection
              onPesoObtenido={handlePesoFromBascula}
              campoDestino={campoBasculaActivo}
            />
          </div>

          {/* Configuración - BOTONES E INPUTS ALINEADOS */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📋 Configuración de Registro</h3>
            <div style={styles.configGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Turno *</label>
                <select
                  value={formData.turno}
                  onChange={(e) => setFormData(prev => ({ ...prev, turno: e.target.value }))}
                  style={styles.select}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="1">Turno 1</option>
                  <option value="2">Turno 2</option>
                  <option value="3">Turno 3</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Material Activo</label>
                <select
                  value={campoBasculaActivo}
                  onChange={(e) => setCampoBasculaActivo(e.target.value)}
                  style={styles.selectPrimary}
                >
                  {tiposScrap.map(t => (
                    <option key={t.columna_db} value={t.columna_db}>
                      {t.tipo_nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Filtrar por Área</label>
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
                <label style={styles.label}>Filtrar por Máquina</label>
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

              <div style={styles.inputGroup}>
                <label style={styles.label}>Control Báscula</label>
                <button
                  type="button"
                  onClick={() => setPesoBloqueado(!pesoBloqueado)}
                  style={pesoBloqueado ? styles.btnLocked : styles.btnUnlocked}
                >
                  {pesoBloqueado ? '🔒 Bloqueada' : '🔓 Activa'}
                </button>
              </div>
            </div>

            {/* Indicador de Selección */}
            {celdaActiva && (
              <div style={styles.activeMachine}>
                <div style={styles.activeMachineHeader}>
                  <span style={styles.activeMachineIcon}>🎯</span>
                  <strong style={styles.activeMachineTitle}>Máquina Activa para Báscula</strong>
                </div>
                <div style={styles.activeMachineDetails}>
                  <span style={styles.activeMachineText}>
                    {tablaData[celdaActiva.areaIndex]?.maquina_real} - {tablaData[celdaActiva.areaIndex]?.area_real}
                  </span>
                  <span style={styles.activeMachineSubtext}>
                    Material: {tiposScrap.find(t => t.columna_db === campoBasculaActivo)?.tipo_nombre}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABLA ANTERIOR MEJORADA - CON MEJOR DISTRIBUCIÓN */}
        <div style={styles.dataSection}>
          <div style={styles.tableHeader}>
            <div style={styles.tableTitleSection}>
              <h3 style={styles.sectionTitle}>📊 Datos de Producción - Todos los Materiales</h3>
              <p style={styles.tableSubtitle}>
                {filtroArea ? `Área: ${filtroArea}` : 'Todas las áreas'}
                {filtroMaquina ? ` | Máquina: ${filtroMaquina}` : ''}
                {celdaActiva ? ` | Activa: ${tablaData[celdaActiva.areaIndex]?.maquina_real}` : ''}
              </p>
            </div>
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Máquinas</span>
                <strong style={styles.statValue}>{datosFiltrados.length}</strong>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Con Datos</span>
                <strong style={{ ...styles.statValue, color: colors.success }}>{filasConPeso}</strong>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Total Kg</span>
                <strong style={{ ...styles.statValue, color: colors.primary }}>{totales.general.toFixed(1)}</strong>
              </div>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeaderCell} className="fixed-column">ÁREA</th>
                  <th style={styles.tableHeaderCell} className="fixed-column">MÁQUINA</th>
                  {tiposScrap.map(tipo => (
                    <th key={tipo.columna_db} style={{
                      ...styles.tableHeaderCell,
                      ...(campoBasculaActivo === tipo.columna_db ? styles.activeColumnHeader : {})
                    }}>
                      <div style={styles.columnHeader}>
                        <span style={styles.columnName}>{tipo.tipo_nombre}</span>
                        <span style={styles.columnUnit}>(kg)</span>
                        {campoBasculaActivo === tipo.columna_db && (
                          <div style={styles.activeColumnIndicator}></div>
                        )}
                      </div>
                    </th>
                  ))}
                  <th style={styles.tableHeaderCell} className="fixed-column">
                    <div style={styles.columnHeader}>
                      <span>TOTAL</span>
                      <span style={styles.columnUnit}>(kg)</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((fila, index) => {
                  const realIndex = tablaData.findIndex(item =>
                    item.area_real === fila.area_real && item.maquina_real === fila.maquina_real
                  );
                  const estaActiva = celdaActiva?.areaIndex === realIndex;
                  const tieneDatos = fila.peso_total > 0;

                  return (
                    <tr
                      key={`${fila.area_real}-${fila.maquina_real}`}
                      style={{
                        ...styles.tableRow,
                        ...(estaActiva ? styles.activeRow : {}),
                        ...(tieneDatos ? styles.dataRow : {})
                      }}
                    >
                      <td style={styles.areaCell}>
                        <div style={styles.areaContent}>
                          <span style={styles.areaText}>{fila.area_real}</span>
                          {estaActiva && <div style={styles.activePulse}></div>}
                        </div>
                      </td>
                      <td style={styles.machineCell}>
                        <div style={styles.machineContent}>
                          <strong style={styles.machineText}>{fila.maquina_real}</strong>
                          {estaActiva && (
                            <div style={styles.activeIndicator}>
                              <span style={styles.activeDot}></span>
                              Activa
                            </div>
                          )}
                        </div>
                      </td>

                      {tiposScrap.map(tipo => {
                        const valor = fila[tipo.columna_db];
                        const celdaEstaActiva = estaActiva && campoBasculaActivo === tipo.columna_db;
                        const tieneValor = valor > 0;

                        return (
                          <td key={tipo.columna_db} style={{
                            ...styles.dataCell,
                            ...(campoBasculaActivo === tipo.columna_db ? styles.activeColumn : {})
                          }}>
                            <div style={styles.inputWrapper}>
                              <input
                                type="number"
                                step="0.001"
                                value={valor || ''}
                                onChange={(e) => handleInputChangeTabla(realIndex, tipo.columna_db, e.target.value)}
                                onFocus={() => activarCeldaParaBascula(realIndex, tipo.columna_db)}
                                style={{
                                  ...styles.inputCell,
                                  ...(tieneValor ? styles.hasData : {}),
                                  ...(celdaEstaActiva ? styles.activeInput : {}),
                                  ...(pesoBloqueado ? styles.disabledInput : {})
                                }}
                                placeholder="0.000"
                                disabled={pesoBloqueado}
                              />
                              {tieneValor && (
                                <div style={styles.valueIndicator}></div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td style={styles.totalCell}>
                        <div style={styles.totalContent}>
                          <strong style={styles.totalValue}>{fila.peso_total.toFixed(3)}</strong>
                          {tieneDatos && (
                            <div style={styles.dataBadge}>
                              ✓
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* FILA DE TOTALES MEJORADA */}
                <tr style={styles.totalsRow}>
                  <td style={styles.totalsLabelCell} colSpan="2">
                    <div style={styles.totalsLabelContent}>
                      <span style={styles.totalsIcon}>📈</span>
                      TOTALES
                    </div>
                  </td>
                  {tiposScrap.map(tipo => (
                    <td key={tipo.columna_db} style={styles.columnTotalCell}>
                      <div style={styles.columnTotalContent}>
                        <strong style={styles.columnTotalValue}>
                          {totales[tipo.columna_db].toFixed(1)}
                        </strong>
                        <div style={styles.totalBarContainer}>
                          <div
                            style={{
                              ...styles.totalBar,
                              width: `${Math.min((totales[tipo.columna_db] / (totales.general || 1)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  ))}
                  <td style={styles.grandTotalCell}>
                    <div style={styles.grandTotalContent}>
                      <strong style={styles.grandTotalValue}>{totales.general.toFixed(1)}</strong>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LEYENDA MEJORADA */}
          <div style={styles.tableFooter}>
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendColor, backgroundColor: colors.primaryLight }}></div>
                <span>Material activo</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendColor, backgroundColor: colors.secondaryLight }}></div>
                <span>Con datos</span>
              </div>
              <div style={styles.legendItem}>
                <div style={styles.legendColor}></div>
                <span>Fila activa</span>
              </div>
            </div>
            <div style={styles.statusInfo}>
              <span style={styles.statusText}>
                {pesoBloqueado ? '🔒 Báscula Bloqueada' : '🔓 Báscula Activa'}
              </span>
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div style={styles.actions}>
          <div style={styles.summary}>
            <div style={styles.summaryContent}>
              <div style={styles.summaryIconContainer}>
                <span style={styles.summaryIcon}>📋</span>
              </div>
              <div style={styles.summaryText}>
                <div style={styles.summaryMain}>
                  <strong style={styles.summaryCount}>
                    {filasConPeso} registro{filasConPeso !== 1 ? 's' : ''} listo{filasConPeso !== 1 ? 's' : ''}
                  </strong>
                  <div style={styles.summaryTotal}>
                    Total general: <strong style={styles.totalWeight}>{totales.general.toFixed(3)} kg</strong>
                  </div>
                </div>
                {/* ELIMINAMOS LA ALERTA DESALINEADA */}
                {filasConPeso > 0 && !formData.turno && (
                  <div style={styles.infoMessage}>
                    <span style={styles.infoIcon}>ℹ️</span>
                    <span style={styles.infoText}>Selecciona un turno para guardar</span>
                  </div>
                )}
                {filasConPeso > 0 && formData.turno && (
                  <div style={styles.readyIndicator}>
                    <span style={styles.readyIcon}>✅</span>
                    <span style={styles.readyText}>Listo para guardar</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={styles.actionButtons}>
            <button
              type="button"
              onClick={onCancelar}
              style={styles.btnCancel}
            >
              <span style={styles.btnIcon}>↩️</span>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !formData.turno || filasConPeso === 0}
              style={{
                ...styles.btnSave,
                ...(enviando || !formData.turno || filasConPeso === 0 ? styles.btnDisabled : {}),
                ...(enviando ? styles.btnLoading : {})
              }}
            >
              <span style={styles.btnIcon}>
                {enviando ? '⏳' : '💾'}
              </span>
              {enviando ? 'Guardando...' : `Guardar ${filasConPeso} Registro${filasConPeso !== 1 ? 's' : ''}`}
              {enviando && <div style={styles.loadingSpinner}></div>}
            </button>
          </div>
        </div>

      </form>
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl
  },

  // CONTROLES PRINCIPALES
  controls: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: spacing.lg,
    alignItems: 'start'
  },
  section: {
    ...baseComponents.card,
    padding: spacing.lg
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray700,
    margin: `0 0 ${spacing.md} 0`
  },

  // CONFIGURACIÓN - ESTILOS CORREGIDOS Y ALINEADOS
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    alignItems: 'start'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    minHeight: '80px' // Altura mínima consistente
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray700,
    marginBottom: spacing.xs,
    height: '20px' // Altura fija para labels
  },

  // INPUTS Y SELECTS CONSISTENTES
  input: {
    width: '100%',
    padding: `0 ${spacing.md}`,
    height: '42px',
    borderRadius: radius.md,
    border: `1px solid ${colors.gray300}`,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.surface,
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: '42px',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    }
  },
  select: {
    width: '100%',
    padding: `0 ${spacing.md}`,
    height: '42px',
    borderRadius: radius.md,
    border: `1px solid ${colors.gray300}`,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.surface,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: '42px',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: `right ${spacing.sm} center`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px 16px',
    paddingRight: '40px',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    }
  },
  selectPrimary: {
    width: '100%',
    padding: `0 ${spacing.md}`,
    height: '42px',
    borderRadius: radius.md,
    border: `2px solid ${colors.primary}`,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.primaryLight,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: '42px',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232563eb' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: `right ${spacing.sm} center`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px 16px',
    paddingRight: '40px',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    }
  },

  // BOTONES CONSISTENTES
  btnLocked: {
    width: '100%',
    padding: `0 ${spacing.md}`,
    height: '42px',
    borderRadius: radius.md,
    border: 'none',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    color: colors.surface,
    transition: 'all 0.2s ease',
    boxShadow: shadows.sm,
    ':hover': {
      backgroundColor: '#DC2626',
      transform: 'translateY(-1px)',
      boxShadow: shadows.md
    }
  },
  btnUnlocked: {
    width: '100%',
    padding: `0 ${spacing.md}`,
    height: '42px',
    borderRadius: radius.md,
    border: 'none',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    color: colors.surface,
    transition: 'all 0.2s ease',
    boxShadow: shadows.sm,
    ':hover': {
      backgroundColor: colors.secondaryHover,
      transform: 'translateY(-1px)',
      boxShadow: shadows.md
    }
  },

  // MÁQUINA ACTIVA
  activeMachine: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    border: `2px solid ${colors.primary}`,
    borderRadius: radius.md
  },
  activeMachineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs
  },
  activeMachineIcon: {
    fontSize: '1.1rem'
  },
  activeMachineTitle: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold
  },
  activeMachineDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },
  activeMachineText: {
    color: colors.gray900,
    fontWeight: typography.weights.bold
  },
  activeMachineSubtext: {
    color: colors.gray600,
    fontSize: typography.sizes.sm
  },
  // TABLA MEJORADA
  dataSection: {
    ...baseComponents.card,
    padding: spacing.lg
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md, // Reducido de lg a md
    flexWrap: 'wrap',
    gap: spacing.md
  },
  tableTitleSection: {
    flex: 1
  },
  tableSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray600,
    marginTop: spacing.xs
  },
  stats: {
    display: 'flex',
    gap: spacing.md // Reducido de lg a md
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: spacing.sm, // Reducido de md a sm
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    minWidth: '70px' // Reducido de 80px
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray600,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: typography.sizes.base, // Reducido de lg a base
    fontWeight: typography.weights.bold
  },

  // CONTENEDOR DE TABLA CON SCROLL
  tableContainer: {
    overflow: 'auto',
    maxHeight: '600px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: radius.md,
    boxShadow: shadows.sm
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px',
    backgroundColor: colors.surface
  },
  tableHeaderCell: {
    backgroundColor: colors.gray800,
    color: colors.surface,
    padding: `${spacing.sm} ${spacing.md}`, // Reducido padding vertical
    fontSize: typography.sizes.xs, // Mantenemos xs
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    border: `1px solid ${colors.gray700}`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    height: '40px' // Altura fija compacta
  },
  activeColumnHeader: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px', // Reducido el gap
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  columnName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    lineHeight: 1.2
  },
  columnUnit: {
    fontSize: typography.sizes.xs,
    opacity: 0.8,
    lineHeight: 1
  },
  activeColumnIndicator: {
    width: '3px', // Reducido
    height: '3px', // Reducido
    backgroundColor: colors.surface,
    borderRadius: '50%',
    marginTop: '1px' // Reducido
  },

  // FILAS Y CELDAS
  tableRow: {
    borderBottom: `1px solid ${colors.gray200}`,
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: colors.gray50
    }
  },
  activeRow: {
    backgroundColor: colors.primaryLight,
    borderLeft: `3px solid ${colors.primary}` // Reducido de 4px
  },
  dataRow: {
    backgroundColor: colors.secondaryLight + '15'
  },
  areaCell: {
    padding: spacing.sm, // Reducido de md a sm
    border: `1px solid ${colors.gray200}`,
    textAlign: 'center',
    backgroundColor: colors.gray50,
    position: 'sticky',
    left: 0,
    zIndex: 5,
    height: '48px' // Altura fija para celdas
  },
  areaContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs
  },
  areaText: {
    fontSize: typography.sizes.sm,
    color: colors.gray700,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase'
  },
  activePulse: {
    width: '5px', // Reducido
    height: '5px', // Reducido
    backgroundColor: colors.primary,
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite'
  },
  machineCell: {
    padding: spacing.sm, // Reducido de md a sm
    border: `1px solid ${colors.gray200}`,
    textAlign: 'center',
    backgroundColor: colors.gray50,
    position: 'sticky',
    left: '100px', // Ajustado por padding reducido
    zIndex: 5,
    height: '48px' // Altura fija
  },
  machineContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs
  },
  machineText: {
    fontSize: typography.sizes.sm,
    color: colors.gray800,
    fontWeight: typography.weights.semibold
  },
  activeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold
  },
  activeDot: {
    width: '5px', // Reducido
    height: '5px', // Reducido
    backgroundColor: colors.primary,
    borderRadius: '50%'
  },
  dataCell: {
    padding: spacing.xs, // Reducido de sm a xs
    border: `1px solid ${colors.gray200}`,
    textAlign: 'center',
    minWidth: '100px',
    height: '48px' // Altura fija
  },
  activeColumn: {
    backgroundColor: colors.primaryLight + '20'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  inputCell: {
    width: '85px', // Ligeramente reducido
    padding: `0 ${spacing.sm}`,
    height: '30px', // Reducido de 32px
    borderRadius: radius.sm,
    border: `1px solid ${colors.gray300}`,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontMono,
    backgroundColor: colors.surface,
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    textAlign: 'right',
    lineHeight: '30px', // Ajustado
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 2px ${colors.primaryLight}`
    }
  },
  hasData: {
    backgroundColor: colors.secondaryLight,
    borderColor: colors.secondary,
    color: colors.gray800,
    fontWeight: typography.weights.bold
  },
  activeInput: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.primaryLight}`,
    backgroundColor: colors.primaryLight
  },
  disabledInput: {
    backgroundColor: colors.gray100,
    color: colors.gray500,
    cursor: 'not-allowed'
  },
  valueIndicator: {
    position: 'absolute',
    bottom: '1px', // Reducido
    left: '50%',
    transform: 'translateX(-50%)',
    width: '14px', // Reducido
    height: '2px',
    backgroundColor: colors.success,
    borderRadius: radius.sm
  },
  totalCell: {
    padding: spacing.sm, // Reducido de md a sm
    border: `1px solid ${colors.gray200}`,
    textAlign: 'center',
    backgroundColor: colors.gray50,
    fontWeight: typography.weights.semibold,
    position: 'sticky',
    right: 0,
    zIndex: 5,
    height: '48px' // Altura fija
  },
  totalContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  totalValue: {
    fontSize: typography.sizes.sm,
    color: colors.gray800
  },
  dataBadge: {
    backgroundColor: colors.success,
    color: colors.surface,
    width: '14px', // Reducido
    height: '14px', // Reducido
    borderRadius: '50%',
    fontSize: typography.sizes.xs,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // PIE DE TABLA MÁS COMPACTO
  totalsRow: {
    backgroundColor: colors.gray800,
    color: colors.surface,
    position: 'sticky',
    bottom: 0,
    zIndex: 5,
    height: '40px' // Altura fija compacta
  },
  totalsLabelCell: {
    padding: `${spacing.xs} ${spacing.md}`, // Reducido padding vertical
    border: `1px solid ${colors.gray700}`,
    textAlign: 'center'
  },
  totalsLabelContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm // Reducido de sm (ya era sm)
  },
  totalsIcon: {
    fontSize: '0.9rem' // Reducido
  },
  columnTotalCell: {
    padding: spacing.xs, // Reducido de sm a xs
    border: `1px solid ${colors.gray700}`,
    textAlign: 'center'
  },
  columnTotalContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px' // Reducido
  },
  columnTotalValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold
  },
  totalBarContainer: {
    width: '50px', // Reducido de 60px
    height: '3px', // Reducido de 4px
    backgroundColor: colors.gray600,
    borderRadius: radius.sm,
    overflow: 'hidden'
  },
  totalBar: {
    height: '100%',
    backgroundColor: colors.primary,
    transition: 'width 0.3s ease'
  },
  grandTotalCell: {
    padding: `${spacing.xs} ${spacing.md}`, // Reducido padding vertical
    border: `1px solid ${colors.gray700}`,
    textAlign: 'center',
    backgroundColor: colors.primary,
    position: 'sticky',
    right: 0,
    zIndex: 6
  },
  grandTotalContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  grandTotalValue: {
    fontSize: typography.sizes.sm, // Reducido de base a sm
    fontWeight: typography.weights.bold
  },

  // FOOTER DE TABLA MÁS COMPACTO
  tableFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm, // Reducido de md a sm
    backgroundColor: colors.gray50,
    borderTop: `1px solid ${colors.gray200}`,
    marginTop: spacing.md,
    minHeight: '40px' // Altura mínima reducida
  },
  legend: {
    display: 'flex',
    gap: spacing.md, // Reducido de lg a md
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.gray600
  },
  legendColor: {
    width: '10px', // Reducido de 12px
    height: '10px', // Reducido de 12px
    borderRadius: radius.sm,
    backgroundColor: colors.gray300
  },
  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px' // Reducido
  },
  statusText: {
    fontSize: typography.sizes.sm,
    color: colors.gray600
  },
  helpText: {
    fontSize: typography.sizes.xs,
    color: colors.gray500,
    fontStyle: 'italic'
  },

  // ACCIONES
  actions: {
    ...baseComponents.card,
    padding: spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.gray50,
    border: `2px solid ${colors.gray200}`
  },
  summary: {
    flex: 1
  },
  summaryContent: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md
  },
  summaryIconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexShrink: 0
  },
  summaryIcon: {
    fontSize: '1.5rem'
  },
  summaryText: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    flex: 1
  },
  summaryMain: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap'
  },
  summaryCount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.gray900,
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  summaryTotal: {
    fontSize: typography.sizes.lg,
    color: colors.gray700,
    fontWeight: typography.weights.medium,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs
  },
  totalWeight: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fontMono
  },

  // INDICADORES SUTILES EN LUGAR DE ALERTAS
  infoMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.primary + '10',
    border: `1px solid ${colors.primary}20`,
    borderRadius: radius.sm,
    maxWidth: 'fit-content'
  },
  readyIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.success + '10',
    border: `1px solid ${colors.success}20`,
    borderRadius: radius.sm,
    maxWidth: 'fit-content'
  },
  infoIcon: {
    fontSize: '0.9rem'
  },
  readyIcon: {
    fontSize: '0.9rem'
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium
  },
  readyText: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: typography.weights.medium
  },

  // BOTONES DE ACCIÓN (MANTENEMOS LOS MEJORADOS)
  actionButtons: {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'center',
    flexShrink: 0
  },
  btnCancel: {
    backgroundColor: colors.surface,
    color: colors.gray700,
    padding: `0 ${spacing.lg}`,
    height: '52px',
    borderRadius: radius.lg,
    border: `2px solid ${colors.gray300}`,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.base,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: shadows.sm,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: '140px',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: colors.gray50,
      borderColor: colors.gray400,
      transform: 'translateY(-2px)',
      boxShadow: shadows.md
    },
    ':active': {
      transform: 'translateY(0)'
    }
  },
  btnSave: {
    backgroundColor: colors.primary,
    color: colors.surface,
    padding: `0 ${spacing.lg}`,
    height: '52px',
    borderRadius: radius.lg,
    border: 'none',
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.base,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: shadows.md,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: '200px',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    ':hover': {
      backgroundColor: colors.primaryHover,
      transform: 'translateY(-2px)',
      boxShadow: shadows.lg
    },
    ':active': {
      transform: 'translateY(0)'
    }
  },
  btnDisabled: {
    backgroundColor: colors.gray400,
    color: colors.gray600,
    cursor: 'not-allowed',
    boxShadow: 'none',
    ':hover': {
      backgroundColor: colors.gray400,
      transform: 'none',
      boxShadow: 'none'
    }
  },
  btnLoading: {
    backgroundColor: colors.primary,
    cursor: 'wait'
  },
  btnIcon: {
    fontSize: '1.2rem',
    flexShrink: 0
  },
  loadingSpinner: {
    width: '16px',
    height: '16px',
    border: `2px solid ${colors.surface}40`,
    borderTop: `2px solid ${colors.surface}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginLeft: spacing.sm
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.gray500,
    minHeight: '400px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: `4px solid ${colors.gray200}`,
    borderTop: `4px solid ${colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: spacing.md
  },
  loadingText: {
    fontSize: typography.sizes.lg,
    color: colors.gray600,
    fontWeight: typography.weights.medium
  },
};

// Agregar animaciones CSS
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