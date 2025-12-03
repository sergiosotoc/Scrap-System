/* src/components/RegistroScrapCompleto.js - VERSIÓN FINAL ULTRA-RÁPIDA (Memoizada) */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';
import { useToast } from '../context/ToastContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const ScrapRow = React.memo(({ 
  fila, 
  realIndex, 
  tiposScrap, 
  campoBasculaActivo, 
  celdaActiva, 
  pesoBloqueado, 
  onFocus, 
  onChange 
}) => {
  const estaActiva = celdaActiva?.areaIndex === realIndex;
  const tieneDatos = fila.peso_total > 0;

  return (
    <tr
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
        <strong style={styles.machineText}>{fila.maquina_real}</strong>
      </td>

      {tiposScrap.map(tipo => {
        const valor = fila[tipo.columna_db];
        const celdaEstaActiva = estaActiva && campoBasculaActivo === tipo.columna_db;
        const tieneValor = valor > 0;

        return (
          <td key={tipo.columna_db} style={{
            ...styles.dataCell,
            ...(celdaEstaActiva ? styles.activeColumn : {})
          }}>
            <div style={styles.inputWrapper}>
              <input
                type="number"
                step="0.001"
                value={valor || ''}
                onChange={(e) => onChange(realIndex, tipo.columna_db, e.target.value)}
                onFocus={() => onFocus(realIndex, tipo.columna_db, fila.area_real, fila.maquina_real)}
                style={{
                  ...styles.inputCell,
                  ...(tieneValor ? styles.hasData : {}),
                  ...(celdaEstaActiva ? styles.activeInput : {}),
                  ...(pesoBloqueado && celdaEstaActiva ? styles.frozenInput : {}), 
                  ...(pesoBloqueado && !celdaEstaActiva ? styles.disabledInput : {})
                }}
                placeholder="-"
                disabled={pesoBloqueado} 
              />
            </div>
          </td>
        );
      })}

      <td style={styles.totalCell}>
        <strong style={styles.totalValue}>{fila.peso_total.toFixed(2)}</strong>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  if (prevProps.fila === nextProps.fila && 
      prevProps.campoBasculaActivo === nextProps.campoBasculaActivo &&
      prevProps.pesoBloqueado === nextProps.pesoBloqueado) {
      
      const prevActive = prevProps.celdaActiva?.areaIndex === prevProps.realIndex;
      const nextActive = nextProps.celdaActiva?.areaIndex === nextProps.realIndex;
      
      if (prevActive === nextActive) {
          return true;
      }
  }
  return false;
});

const RegistroScrapCompleto = ({ onRegistroCreado, onCancelar, onLoadComplete }) => {
  const { addToast } = useToast();
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tablaData, setTablaData] = useState([]);
  
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroMaquina, setFiltroMaquina] = useState('');
  const [campoBasculaActivo, setCampoBasculaActivo] = useState('peso_cobre');
  const [pesoBloqueado, setPesoBloqueado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [areasDisponibles, setAreasDisponibles] = useState([]);
  const [maquinasDisponibles, setMaquinasDisponibles] = useState([]);

  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState({
    area: '',
    maquina: '',
    index: null
  });
  const [celdaActiva, setCeldaActiva] = useState(null);

  const [formData, setFormData] = useState({
    turno: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const maquinaSeleccionadaRef = useRef(maquinaSeleccionada);
  const celdaActivaRef = useRef(celdaActiva);
  const pesoBloqueadoRef = useRef(pesoBloqueado);
  const campoBasculaActivoRef = useRef(campoBasculaActivo);
  const pesoCongeladoRef = useRef(0);
  
  useEffect(() => { maquinaSeleccionadaRef.current = maquinaSeleccionada; }, [maquinaSeleccionada]);
  useEffect(() => { celdaActivaRef.current = celdaActiva; }, [celdaActiva]);
  useEffect(() => { pesoBloqueadoRef.current = pesoBloqueado; }, [pesoBloqueado]);
  useEffect(() => { campoBasculaActivoRef.current = campoBasculaActivo; }, [campoBasculaActivo]);

  const tiposScrap = useMemo(() => {
    return config?.tipos_scrap ? Object.values(config.tipos_scrap).flat() : [];
  }, [config]);

  useEffect(() => {
    let mounted = true;

    const initData = async () => {
      try {
        const configData = await apiClient.getRegistrosConfig();
        
        if (!mounted) return;
        
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
        }
      } catch (error) {
        if (mounted) {
          addToast('Error cargando configuración: ' + error.message, 'error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          if (onLoadComplete) onLoadComplete();
        }
      }
    };

    initData();
    return () => { mounted = false; };
  }, []); 

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

  useEffect(() => {
    const filtrosCompletos = filtroArea && filtroMaquina && campoBasculaActivo;
    
    if (filtrosCompletos && tablaData.length > 0) {
      const index = tablaData.findIndex(r => r.area_real === filtroArea && r.maquina_real === filtroMaquina);
      
      if (index !== -1) {
        const filaDiferente = maquinaSeleccionada.index !== index;
        const columnaDiferente = celdaActiva?.campo !== campoBasculaActivo;

        if (filaDiferente || columnaDiferente) {
          setMaquinaSeleccionada({ area: filtroArea, maquina: filtroMaquina, index });
          setCeldaActiva({ areaIndex: index, campo: campoBasculaActivo });
          setPesoBloqueado(false);
        }
      }
    }
  }, [filtroArea, filtroMaquina, campoBasculaActivo, tablaData, maquinaSeleccionada.index, celdaActiva?.campo]);

  const calcularTotalFila = (fila) => {
    const camposPeso = [
      'peso_cobre', 'peso_cobre_estanado', 'peso_purga_pvc', 'peso_purga_pe',
      'peso_purga_pur', 'peso_purga_pp', 'peso_cable_pvc', 'peso_cable_pe',
      'peso_cable_pur', 'peso_cable_pp', 'peso_cable_aluminio',
      'peso_cable_estanado_pvc', 'peso_cable_estanado_pe'
    ];
    return camposPeso.reduce((total, campo) => total + (parseFloat(fila[campo]) || 0), 0);
  };

  const handlePesoFromBascula = useCallback((pesoInput) => {
    const currentBloqueado = pesoBloqueadoRef.current;
    const currentMaquinaSel = maquinaSeleccionadaRef.current;
    const currentCelda = celdaActivaRef.current;
    const campoDestino = campoBasculaActivoRef.current;

    if (!campoDestino) return;

    let nuevoValor = 0;

    if (currentBloqueado) {
        nuevoValor = pesoCongeladoRef.current || 0;
    } else {
        if (pesoInput === undefined || pesoInput === null) return;
        nuevoValor = parseFloat(pesoInput) || 0;
        pesoCongeladoRef.current = nuevoValor;
    }
    
    let targetIndex = -1;
    if (currentMaquinaSel.index !== null) {
      targetIndex = currentMaquinaSel.index;
    } else if (currentCelda && currentCelda.areaIndex !== undefined) {
      targetIndex = currentCelda.areaIndex;
    }

    if (targetIndex !== -1) {
      setTablaData(prevData => {
        const valorActual = prevData[targetIndex][campoDestino];
        if (Math.abs(valorActual - nuevoValor) < 0.001) {
            return prevData; 
        }

        const newData = [...prevData];
        const filaActualizada = {
          ...newData[targetIndex],
          [campoDestino]: nuevoValor,
          conexion_bascula: nuevoValor > 0
        };
        filaActualizada.peso_total = calcularTotalFila(filaActualizada);
        newData[targetIndex] = filaActualizada;
        
        return newData;
      });
    }
  }, []);

  const handleMaterialChange = (newMaterial) => {
    setCampoBasculaActivo(newMaterial);
  };

  const handleCellFocus = useCallback((areaIndex, campo, area, maquina) => {
    if (celdaActivaRef.current?.areaIndex === areaIndex && campoBasculaActivoRef.current === campo) {
        return;
    }

    setCeldaActiva({ areaIndex, campo });
    setCampoBasculaActivo(campo);
    setMaquinaSeleccionada({
      area: area,
      maquina: maquina,
      index: areaIndex
    });
    
    setFiltroArea(area);
    setFiltroMaquina(maquina);
    setPesoBloqueado(false);
  }, []);

  const handleInputChangeTabla = useCallback((areaIndex, campo, valor) => {
    setTablaData(prev => {
      const val = parseFloat(valor) || 0;
      if (prev[areaIndex][campo] === val) return prev;

      const newData = [...prev];
      newData[areaIndex] = {
        ...newData[areaIndex],
        [campo]: val,
        peso_total: calcularTotalFila({ ...newData[areaIndex], [campo]: val })
      };
      return newData;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.turno) {
      addToast('Seleccione el turno', 'warning');
      return;
    }

    const filasConPeso = tablaData.filter(fila => fila.peso_total > 0);

    if (filasConPeso.length === 0) {
      addToast('Ingrese al menos un peso en alguna fila', 'warning');
      return;
    }

    setEnviando(true);
    try {
      const promises = filasConPeso.map(fila => {
        const datosEnvio = {
            turno: formData.turno,
            fecha_registro: formData.fecha,
            area_real: fila.area_real,
            maquina_real: fila.maquina_real,
            conexion_bascula: fila.conexion_bascula || false,
            numero_lote: `LOTE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            observaciones: 'Registro masivo',
            material_seleccionado: campoBasculaActivo, 
            peso_actual: fila[campoBasculaActivo] || 0,
            ...fila
        };
        return apiClient.createRegistroScrap(datosEnvio);
      });

      await Promise.all(promises);
      if (onRegistroCreado) onRegistroCreado();

    } catch (error) {
      addToast('Error al guardar: ' + error.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  const totales = useMemo(() => {
    const acc = {};
    const camposPeso = [
      'peso_cobre', 'peso_cobre_estanado', 'peso_purga_pvc', 'peso_purga_pe',
      'peso_purga_pur', 'peso_purga_pp', 'peso_cable_pvc', 'peso_cable_pe',
      'peso_cable_pur', 'peso_cable_pp', 'peso_cable_aluminio',
      'peso_cable_estanado_pvc', 'peso_cable_estanado_pe'
    ];

    camposPeso.forEach(c => acc[c] = 0);
    acc.general = 0;

    tablaData.forEach(fila => {
        camposPeso.forEach(c => {
            acc[c] += (parseFloat(fila[c]) || 0);
        });
        acc.general += (parseFloat(fila.peso_total) || 0);
    });

    return acc;
  }, [tablaData]); 

  const datosFiltrados = useMemo(() => {
    return tablaData.filter(fila => {
        if (filtroArea && fila.area_real !== filtroArea) return false;
        if (filtroMaquina && fila.maquina_real !== filtroMaquina) return false;
        return true;
    });
  }, [tablaData, filtroArea, filtroMaquina]);

  if (loading) {
    return <div style={styles.loading}><p>Cargando datos...</p></div>;
  }

  const filasConPeso = tablaData.filter(fila => fila.peso_total > 0).length;

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.controls}>
          <div style={styles.section}>
            <BasculaConnection
              onPesoObtenido={handlePesoFromBascula}
              campoDestino={campoBasculaActivo}
            />
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Configuración de Registro</h3>
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
                  onChange={(e) => handleMaterialChange(e.target.value)}
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
                  {pesoBloqueado ? (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        PESO CONGELADO
                    </>
                  ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                        </svg>
                        LECTURA ACTIVA
                    </>
                  )}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Máquina Fijada</label>
              <div style={styles.fixedMachineDisplay}>
                {maquinaSeleccionada.maquina ? (
                  <>
                    <strong style={styles.fixedMachineName}>{maquinaSeleccionada.maquina}</strong>
                    <span style={styles.fixedMachineArea}>{maquinaSeleccionada.area}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMaquinaSeleccionada({ area: '', maquina: '', index: null });
                        setCeldaActiva(null);
                      }}
                      style={styles.unfixButton}
                      title="Liberar máquina"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </>
                ) : (
                  <span style={styles.noFixedMachine}>Ninguna (Click en tabla)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.dataSection}>
          <div style={styles.tableHeader}>
            <div style={styles.tableTitleSection}>
              <h3 style={styles.sectionTitle}>Datos de Producción</h3>
              <p style={styles.tableSubtitle}>
                {filtroArea ? `Área: ${filtroArea}` : 'Todas las áreas'}
                {filtroMaquina ? ` | Máquina: ${filtroMaquina}` : ''}
              </p>
            </div>
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Máquinas Visibles</span>
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
                        {campoBasculaActivo === tipo.columna_db && (
                          <div style={styles.activeColumnIndicator}></div>
                        )}
                      </div>
                    </th>
                  ))}
                  <th style={styles.tableHeaderCell}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((fila) => {
                  const realIndex = tablaData.findIndex(item => 
                    item.area_real === fila.area_real && item.maquina_real === fila.maquina_real
                  );
                  
                  return (
                    <ScrapRow
                      key={`${fila.area_real}-${fila.maquina_real}`}
                      fila={fila}
                      realIndex={realIndex}
                      tiposScrap={tiposScrap}
                      campoBasculaActivo={campoBasculaActivo}
                      celdaActiva={celdaActiva}
                      pesoBloqueado={pesoBloqueado}
                      onFocus={handleCellFocus}
                      onChange={handleInputChangeTabla}
                    />
                  );
                })}

                <tr style={styles.totalsRow}>
                  <td style={styles.totalsLabelCell} colSpan="2">TOTALES</td>
                  {tiposScrap.map(tipo => (
                    <td key={tipo.columna_db} style={styles.columnTotalCell}>
                      <strong style={styles.columnTotalValue}>
                        {totales[tipo.columna_db].toFixed(1)}
                      </strong>
                    </td>
                  ))}
                  <td style={styles.grandTotalCell}>
                    <strong style={styles.grandTotalValue}>{totales.general.toFixed(1)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.actions}>
          <div style={styles.summary}>
             <span style={styles.summaryCount}>
                {filasConPeso} registros listos | Total: {totales.general.toFixed(2)} kg
             </span>
          </div>
          <div style={styles.actionButtons}>
            <button
              type="button"
              onClick={onCancelar}
              style={styles.btnCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !formData.turno || filasConPeso === 0}
              style={{
                ...styles.btnSave,
                ...(enviando || !formData.turno || filasConPeso === 0 ? styles.btnDisabled : {})
              }}
            >
              {enviando ? 'Guardando...' : 'Guardar Todo'}
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
    minHeight: '80px'
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray700,
    marginBottom: spacing.xs,
    height: '20px'
  },
  input: {
    ...baseComponents.input,
    height: '42px'
  },
  select: {
    ...baseComponents.select,
    height: '42px',
    paddingRight: '40px'
  },
  selectPrimary: {
    ...baseComponents.select,
    height: '42px',
    borderWidth: '2px',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingRight: '40px'
  },
  btnLocked: {
    ...baseComponents.buttonDestructive,
    height: '42px',
    width: '100%',
    justifyContent: 'center'
  },
  btnUnlocked: {
    ...baseComponents.buttonPrimary,
    backgroundColor: colors.success,
    height: '42px',
    width: '100%',
    justifyContent: 'center',
    ':hover': {
        backgroundColor: colors.secondaryHover
    }
  },
  activeMachine: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: colors.primary,
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
  dataSection: {
    ...baseComponents.card,
    padding: spacing.lg
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
    gap: spacing.md
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    minWidth: '70px'
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray600,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold
  },
  tableContainer: {
    overflow: 'auto',
    maxHeight: '600px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray200,
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
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    height: '40px'
  },
  activeColumnHeader: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
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
    width: '3px',
    height: '3px',
    backgroundColor: colors.surface,
    borderRadius: '50%',
    marginTop: '1px'
  },
  tableRow: {
    borderBottom: `1px solid ${colors.gray200}`,
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: colors.gray50
    }
  },
  activeRow: {
    backgroundColor: colors.primaryLight,
    borderLeft: `3px solid ${colors.primary}`
  },
  dataRow: {
    backgroundColor: colors.secondaryLight + '15'
  },
  areaCell: {
    padding: spacing.sm,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray200,
    textAlign: 'center',
    backgroundColor: colors.gray50,
    position: 'sticky',
    left: 0,
    zIndex: 5,
    height: '48px'
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
    width: '5px',
    height: '5px',
    backgroundColor: colors.primary,
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite'
  },
  machineCell: {
    padding: spacing.sm,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray200,
    textAlign: 'center',
    backgroundColor: colors.gray50,
    position: 'sticky',
    left: '100px',
    zIndex: 5,
    height: '48px'
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
    width: '5px',
    height: '5px',
    backgroundColor: colors.primary,
    borderRadius: '50%'
  },
  dataCell: {
    padding: spacing.xs,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray200,
    textAlign: 'center',
    minWidth: '100px',
    height: '48px'
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
    width: '85px',
    padding: `0 ${spacing.sm}`,
    height: '30px',
    borderRadius: radius.sm,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray300,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontMono,
    backgroundColor: colors.surface,
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    textAlign: 'right',
    lineHeight: '30px',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 2px ${colors.primaryLight}`
    }
  },
  frozenInput: {
    backgroundColor: colors.info + '20', // Azul claro para indicar congelado
    borderColor: colors.info,
    color: colors.gray800,
    fontWeight: 'bold'
  },
  hasData: {
    backgroundColor: colors.secondaryLight,
    borderWidth: '1px',
    borderStyle: 'solid',
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
    bottom: '1px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '14px',
    height: '2px',
    backgroundColor: colors.success,
    borderRadius: radius.sm
  },
  totalCell: {
    padding: spacing.sm,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray200,
    textAlign: 'center',
    backgroundColor: colors.gray50,
    fontWeight: typography.weights.semibold,
    position: 'sticky',
    right: 0,
    zIndex: 5,
    height: '48px'
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
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    fontSize: typography.sizes.xs,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  totalsRow: {
    backgroundColor: colors.gray800,
    color: colors.surface,
    position: 'sticky',
    bottom: 0,
    zIndex: 5,
    height: '40px'
  },
  totalsLabelCell: {
    padding: `${spacing.xs} ${spacing.md}`,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray700,
    textAlign: 'center'
  },
  totalsLabelContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm
  },
  totalsIcon: {
    fontSize: '0.9rem'
  },
  columnTotalCell: {
    padding: spacing.xs,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray700,
    textAlign: 'center'
  },
  columnTotalContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px'
  },
  columnTotalValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold
  },
  totalBarContainer: {
    width: '50px',
    height: '3px',
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
    padding: `${spacing.xs} ${spacing.md}`,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.gray700,
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
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold
  },
  tableFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.gray50,
    borderTop: `1px solid ${colors.gray200}`,
    marginTop: spacing.md,
    minHeight: '40px'
  },
  legend: {
    display: 'flex',
    gap: spacing.md,
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
    width: '10px',
    height: '10px',
    borderRadius: radius.sm,
    backgroundColor: colors.gray300
  },
  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px'
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
  actions: {
    ...baseComponents.card,
    padding: spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.gray50,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: colors.gray200
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
  infoMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.primary + '10',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primary + '20',
    borderRadius: radius.sm,
    maxWidth: 'fit-content'
  },
  readyIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.success + '10',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.success + '20',
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
  actionButtons: {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'center',
    flexShrink: 0
  },
  btnCancel: {
    ...baseComponents.buttonSecondary,
    height: '52px',
    padding: `0 ${spacing.lg}`,
    minWidth: '140px',
    justifyContent: 'center',
    borderWidth: '2px',
    borderRadius: radius.lg,
    fontSize: typography.sizes.base
  },
  btnSave: {
    ...baseComponents.buttonPrimary,
    height: '52px',
    padding: `0 ${spacing.lg}`,
    minWidth: '200px',
    justifyContent: 'center',
    borderRadius: radius.lg,
    fontSize: typography.sizes.base
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
  fixedMachineDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: colors.primary,
    minHeight: '42px'
  },
  fixedMachineName: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    flex: 1
  },
  fixedMachineArea: {
    fontSize: typography.sizes.xs,
    color: colors.gray600,
    backgroundColor: colors.gray100,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.sm
  },
  unfixButton: {
    background: 'none',
    border: 'none',
    color: colors.error,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    padding: spacing.xs,
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: colors.error + '20'
    }
  },
  noFixedMachine: {
    fontSize: typography.sizes.sm,
    color: colors.gray500,
    fontStyle: 'italic',
    width: '100%',
    textAlign: 'center'
  },
  fixedBadge: {
    marginLeft: spacing.xs,
    color: colors.primary,
    fontSize: '0.9rem'
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
  }
};

export default RegistroScrapCompleto;