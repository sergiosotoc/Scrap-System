/* src/components/RegistroScrapCompleto.js - Alineación de Tabla Corregida */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';
import { useToast } from '../context/ToastContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

// Componentes Smooth
import SmoothButton from './SmoothButton';
import LoadingSpinner from './LoadingSpinner';
import CardTransition from './CardTransition';

// --- UTILIDAD: CORRECCIÓN MATEMÁTICA (Redondeo simple) ---
const round3 = (num) => {
  return Math.round((parseFloat(num) || 0) * 1000) / 1000;
};

// --- UTILIDAD: SUMA SEGURA (Precisión Decimal Absoluta) ---
const safeSum = (numeros) => {
  const sumaEntera = numeros.reduce((acc, num) => {
    return acc + Math.round((parseFloat(num) || 0) * 1000);
  }, 0);
  return sumaEntera / 1000;
};

// --- CONTADOR ANIMADO ---
const AnimatedCounter = ({ value, duration = 800, decimals = 2 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = count; 
    const endValue = parseFloat(value) || 0;
    
    if (endValue === count) return;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(2, -10 * progress);
      const nextValue = startValue + (endValue - startValue) * easeOut;
      setCount(nextValue);

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

// --- FILA DE TABLA ---
const ScrapRow = React.memo(({ 
  fila, 
  realIndex, 
  tiposScrap, 
  campoBasculaActivo, 
  celdaActiva, 
  pesoBloqueado, 
  onFocus, 
  onChange,
  animate, 
  indexDisplay 
}) => {
  const estaActiva = celdaActiva?.areaIndex === realIndex;
  const tieneDatos = fila.peso_total > 0;

  return (
    <tr
      style={{
        ...styles.tableRow,
        ...(estaActiva ? styles.activeRow : {}),
        ...(tieneDatos ? styles.dataRow : {}),
        opacity: animate ? 1 : 0,
        transform: animate ? 'translateX(0)' : 'translateX(-10px)',
        transition: `opacity 0.4s ease, transform 0.4s ease, background-color 0.2s ease`,
        transitionDelay: `${indexDisplay * 0.03}s`
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
                value={valor === 0 ? '' : valor}
                onChange={(e) => onChange(realIndex, tipo.columna_db, e.target.value)}
                // CORRECCIÓN: onClick asegura el foco en navegadores estrictos
                onClick={() => onFocus(realIndex, tipo.columna_db, fila.area_real, fila.maquina_real)}
                onFocus={() => onFocus(realIndex, tipo.columna_db, fila.area_real, fila.maquina_real)}
                style={{
                  ...styles.inputCell,
                  ...(tieneValor ? styles.hasData : {}),
                  ...(celdaEstaActiva ? styles.activeInput : {}),
                  ...(pesoBloqueado && celdaEstaActiva ? styles.frozenInput : {}), 
                  ...(pesoBloqueado && !celdaEstaActiva ? styles.disabledInput : {})
                }}
                placeholder="-"
                // CORRECCIÓN: readOnly permite cambiar el foco aunque no se pueda escribir
                readOnly={pesoBloqueado} 
              />
            </div>
          </td>
        );
      })}

      <td style={styles.totalCell}>
        <strong style={styles.totalValue}>{fila.peso_total.toFixed(3)}</strong>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  if (prevProps.fila === nextProps.fila && 
      prevProps.campoBasculaActivo === nextProps.campoBasculaActivo &&
      prevProps.pesoBloqueado === nextProps.pesoBloqueado &&
      prevProps.animate === nextProps.animate) {
      
      const prevActive = prevProps.celdaActiva?.areaIndex === prevProps.realIndex;
      const nextActive = nextProps.celdaActiva?.areaIndex === nextProps.realIndex;
      
      return prevActive === nextActive;
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
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  const [areasDisponibles, setAreasDisponibles] = useState([]);
  const [maquinasDisponibles, setMaquinasDisponibles] = useState([]);

  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState({ area: '', maquina: '', index: null });
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
  
  // REF DEL CANDADO
  const lockedTargetRef = useRef(null);
  
  useEffect(() => { maquinaSeleccionadaRef.current = maquinaSeleccionada; }, [maquinaSeleccionada]);
  useEffect(() => { celdaActivaRef.current = celdaActiva; }, [celdaActiva]);
  useEffect(() => { pesoBloqueadoRef.current = pesoBloqueado; }, [pesoBloqueado]);
  useEffect(() => { campoBasculaActivoRef.current = campoBasculaActivo; }, [campoBasculaActivo]);

  // EFECTO PARA EL CANDADO DE DESTINO
  useEffect(() => {
    if (pesoBloqueado) {
        lockedTargetRef.current = {
            index: maquinaSeleccionadaRef.current.index !== null ? maquinaSeleccionadaRef.current.index : celdaActivaRef.current?.areaIndex,
            field: campoBasculaActivoRef.current
        };
    } else {
        lockedTargetRef.current = null;
    }
  }, [pesoBloqueado]);

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
                peso_cobre: 0, peso_cobre_estanado: 0, peso_purga_pvc: 0, peso_purga_pe: 0,
                peso_purga_pur: 0, peso_purga_pp: 0, peso_cable_pvc: 0, peso_cable_pe: 0,
                peso_cable_pur: 0, peso_cable_pp: 0, peso_cable_aluminio: 0,
                peso_cable_estanado_pvc: 0, peso_cable_estanado_pe: 0,
                peso_total: 0, conexion_bascula: false
              });
            });
          });
          setTablaData(data);
          setAreasDisponibles(areas);
        }
      } catch (error) {
        if (mounted) addToast('Error cargando configuración: ' + error.message, 'error');
      } finally {
        if (mounted) {
          setLoading(false);
          if (onLoadComplete) onLoadComplete();
          setTimeout(() => setTriggerAnimation(true), 150);
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
    return safeSum(camposPeso.map(c => fila[c]));
  };

  // CALLBACK OPTIMIZADO CON PROTECCIÓN DE ESCRITURA ESTRICTA
  const handlePesoFromBascula = useCallback((pesoInput, campoDestinoEnviado) => {
    const currentBloqueado = pesoBloqueadoRef.current;
    const currentMaquinaSel = maquinaSeleccionadaRef.current;
    const currentCelda = celdaActivaRef.current;
    
    // 1. DEFINIR DESTINO REAL: Siempre usamos lo que el padre sabe que está activo
    const campoRealActivo = campoBasculaActivoRef.current;

    // 2. PROTECCIÓN CONTRA DATOS VIEJOS (CORRECCIÓN CRÍTICA)
    // Si la báscula manda un dato "etiquetado" para un campo (campoDestinoEnviado) 
    // que NO es el que tenemos activo actualmente (campoRealActivo), lo descartamos.
    // Esto evita que un paquete retrasado del "campo error" sobrescriba el nuevo campo o viceversa.
    if (campoDestinoEnviado && campoDestinoEnviado !== campoRealActivo) {
        return; 
    }

    // Usamos el campo activo real como destino final
    const campoDestino = campoRealActivo;
    if (!campoDestino) return;

    let targetIndex = -1;
    if (currentMaquinaSel.index !== null) {
      targetIndex = currentMaquinaSel.index;
    } else if (currentCelda && currentCelda.areaIndex !== undefined) {
      targetIndex = currentCelda.areaIndex;
    }

    // 3. PROTECCIÓN DE CANDADO
    if (currentBloqueado && lockedTargetRef.current) {
        const locked = lockedTargetRef.current;
        // Si estamos bloqueados, SOLO permitimos escribir si seguimos en la misma celda exacta
        if (locked.index !== targetIndex || locked.field !== campoDestino) {
            return; 
        }
    }

    let nuevoValor = 0;

    if (currentBloqueado) {
        nuevoValor = pesoCongeladoRef.current || 0;
    } else {
        if (pesoInput === undefined || pesoInput === null) return;
        nuevoValor = parseFloat(pesoInput) || 0;
        pesoCongeladoRef.current = nuevoValor; 
    }
    
    nuevoValor = round3(nuevoValor);

    if (targetIndex !== -1) {
      setTablaData(prevData => {
        const valorActual = prevData[targetIndex][campoDestino];
        
        if (Math.abs(valorActual - nuevoValor) < 0.0001) {
            return prevData; 
        }

        const newData = [...prevData];
        const filaActualizada = { ...newData[targetIndex] };
        
        filaActualizada[campoDestino] = nuevoValor;
        filaActualizada.conexion_bascula = nuevoValor > 0;
        filaActualizada.peso_total = calcularTotalFila(filaActualizada);
        
        newData[targetIndex] = filaActualizada;
        return newData;
      });
    }
  }, []);

  const handleMaterialChange = (newMaterial) => {
    setCampoBasculaActivo(newMaterial);
    if (celdaActiva && celdaActiva.areaIndex !== null) {
        setCeldaActiva(prev => ({ ...prev, campo: newMaterial }));
    }
  };

  const handleCellFocus = useCallback((areaIndex, campo, area, maquina) => {
    if (celdaActivaRef.current?.areaIndex === areaIndex && campoBasculaActivoRef.current === campo) {
        return;
    }
    
    setCeldaActiva({ areaIndex, campo });
    setCampoBasculaActivo(campo);
    setMaquinaSeleccionada({ area, maquina, index: areaIndex });
    setFiltroArea(area);
    setFiltroMaquina(maquina);
  }, []);

  const handleInputChangeTabla = useCallback((areaIndex, campo, valor) => {
    setTablaData(prev => {
      const val = round3(parseFloat(valor) || 0); 
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
    if (!formData.turno) { addToast('Seleccione el turno', 'warning'); return; }
    const filasConPeso = tablaData.filter(fila => fila.peso_total > 0);
    if (filasConPeso.length === 0) { addToast('Ingrese al menos un peso en alguna fila', 'warning'); return; }

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

  // DATOS FILTRADOS
  const datosFiltrados = useMemo(() => {
    return tablaData.filter(fila => {
        if (filtroArea && fila.area_real !== filtroArea) return false;
        if (filtroMaquina && fila.maquina_real !== filtroMaquina) return false;
        return true;
    });
  }, [tablaData, filtroArea, filtroMaquina]);

  // CALCULO DE TOTALES
  const totales = useMemo(() => {
    const acc = {};
    const camposPeso = [
      'peso_cobre', 'peso_cobre_estanado', 'peso_purga_pvc', 'peso_purga_pe',
      'peso_purga_pur', 'peso_purga_pp', 'peso_cable_pvc', 'peso_cable_pe',
      'peso_cable_pur', 'peso_cable_pp', 'peso_cable_aluminio',
      'peso_cable_estanado_pvc', 'peso_cable_estanado_pe'
    ];

    camposPeso.forEach(c => acc[c] = 0);
    let generalInt = 0; 

    tablaData.forEach(fila => {
        camposPeso.forEach(c => {
            acc[c] += Math.round((parseFloat(fila[c]) || 0) * 1000);
        });
        generalInt += Math.round((parseFloat(fila.peso_total) || 0) * 1000);
    });

    camposPeso.forEach(c => acc[c] = acc[c] / 1000);
    acc.general = generalInt / 1000;

    return acc;
  }, [tablaData]); 

  if (loading) {
    return <div style={styles.loading}><LoadingSpinner message="Cargando configuración de máquinas..." /></div>;
  }

  const filasConPeso = tablaData.filter(fila => fila.peso_total > 0).length;
  const isSaveDisabled = enviando || !formData.turno || filasConPeso === 0;

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.controls}>
          <CardTransition delay={0} style={styles.section}>
            <BasculaConnection
              onPesoObtenido={handlePesoFromBascula}
              campoDestino={campoBasculaActivo}
            />
          </CardTransition>

          <CardTransition delay={100} style={styles.section}>
            <h3 style={styles.sectionTitle}>Configuración de Registro</h3>
            <div style={styles.configGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Fecha</label>
                <input type="date" value={formData.fecha} onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Turno *</label>
                <select value={formData.turno} onChange={(e) => setFormData(prev => ({ ...prev, turno: e.target.value }))} style={styles.select} required>
                  <option value="">Seleccionar...</option>
                  <option value="1">Turno 1</option>
                  <option value="2">Turno 2</option>
                  <option value="3">Turno 3</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Material Activo</label>
                <select value={campoBasculaActivo} onChange={(e) => handleMaterialChange(e.target.value)} style={styles.selectPrimary}>
                  {tiposScrap.map(t => <option key={t.columna_db} value={t.columna_db}>{t.tipo_nombre}</option>)}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Filtrar por Área</label>
                <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} style={styles.select}>
                  <option value="">Todas las áreas</option>
                  {areasDisponibles.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Filtrar por Máquina</label>
                <select value={filtroMaquina} onChange={(e) => setFiltroMaquina(e.target.value)} style={styles.select} disabled={!filtroArea}>
                  <option value="">Todas las máquinas</option>
                  {maquinasDisponibles.map(maquina => <option key={maquina} value={maquina}>{maquina}</option>)}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Control Báscula</label>
                <SmoothButton type="button" onClick={() => setPesoBloqueado(!pesoBloqueado)} style={pesoBloqueado ? styles.btnLocked : styles.btnUnlocked} variant={pesoBloqueado ? 'destructive' : 'primary'}>
                  {pesoBloqueado ? 'PESO CONGELADO' : 'LECTURA ACTIVA'}
                </SmoothButton>
              </div>
            </div>
            
            <div style={{...styles.inputGroup, marginTop: spacing.md}}>
              <label style={styles.label}>Máquina Fijada</label>
              <div style={styles.fixedMachineDisplay}>
                {maquinaSeleccionada.maquina ? (
                  <>
                    <strong style={styles.fixedMachineName}>{maquinaSeleccionada.maquina}</strong>
                    <span style={styles.fixedMachineArea}>{maquinaSeleccionada.area}</span>
                    <button type="button" onClick={() => { setMaquinaSeleccionada({ area: '', maquina: '', index: null }); setCeldaActiva(null); }} style={styles.unfixButton} title="Liberar máquina">✕</button>
                  </>
                ) : (
                  <span style={styles.noFixedMachine}>Ninguna (Click en tabla)</span>
                )}
              </div>
            </div>
          </CardTransition>
        </div>

        <CardTransition delay={200} style={styles.dataSection}>
          <div style={styles.tableHeader}>
            <div style={styles.tableTitleSection}>
              <h3 style={styles.sectionTitle}>Datos de Producción</h3>
              <p style={styles.tableSubtitle}>{filtroArea ? `Área: ${filtroArea}` : 'Todas las áreas'}{filtroMaquina ? ` | Máquina: ${filtroMaquina}` : ''}</p>
            </div>
            <div style={styles.stats}>
              <div style={styles.statItem}><span style={styles.statLabel}>Máquinas</span><strong style={styles.statValue}><AnimatedCounter value={datosFiltrados.length} duration={500} decimals={0} /></strong></div>
              <div style={styles.statItem}><span style={styles.statLabel}>Con Datos</span><strong style={{ ...styles.statValue, color: colors.success }}><AnimatedCounter value={filasConPeso} duration={500} decimals={0} /></strong></div>
              <div style={styles.statItem}><span style={styles.statLabel}>Total Kg</span><strong style={{ ...styles.statValue, color: colors.primary }}><AnimatedCounter value={totales.general} decimals={3} /></strong></div>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.fixedHeaderArea}>ÁREA</th>
                  <th style={styles.fixedHeaderMachine}>MÁQUINA</th>
                  {tiposScrap.map(tipo => (
                    <th key={tipo.columna_db} style={{ ...styles.tableHeaderCell, ...(campoBasculaActivo === tipo.columna_db ? styles.activeColumnHeader : {}) }}>
                      <div style={styles.columnHeader}>
                        <span style={styles.columnName}>{tipo.tipo_nombre}</span>
                        {campoBasculaActivo === tipo.columna_db && <div style={styles.activeColumnIndicator}></div>}
                      </div>
                    </th>
                  ))}
                  <th style={styles.fixedHeaderTotal}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((fila, index) => {
                  const realIndex = tablaData.findIndex(item => item.area_real === fila.area_real && item.maquina_real === fila.maquina_real);
                  return (
                    <ScrapRow key={`${fila.area_real}-${fila.maquina_real}`} fila={fila} realIndex={realIndex} tiposScrap={tiposScrap} campoBasculaActivo={campoBasculaActivo} celdaActiva={celdaActiva} pesoBloqueado={pesoBloqueado} onFocus={handleCellFocus} onChange={handleInputChangeTabla} animate={triggerAnimation} indexDisplay={index} />
                  );
                })}
                <tr style={styles.totalsRow}>
                  <td style={styles.fixedTotalArea} colSpan="2">TOTALES</td>
                  {tiposScrap.map(tipo => (
                    <td key={tipo.columna_db} style={styles.columnTotalCell}>
                      <strong style={styles.columnTotalValue}><AnimatedCounter value={totales[tipo.columna_db]} duration={500} decimals={3} /></strong>
                    </td>
                  ))}
                  <td style={styles.fixedTotalValue}><strong style={styles.grandTotalValue}><AnimatedCounter value={totales.general} decimals={3} /></strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardTransition>

        <CardTransition delay={300} style={styles.actions}>
          <div style={styles.summary}><span style={styles.summaryCount}><AnimatedCounter value={filasConPeso} duration={500} decimals={0} /> registros listos | Total: <AnimatedCounter value={totales.general} decimals={3} /> kg</span></div>
          <div style={styles.actionButtons}>
            <SmoothButton type="button" onClick={onCancelar} style={styles.btnCancel} variant="secondary">Cancelar</SmoothButton>
            <SmoothButton type="submit" disabled={isSaveDisabled} style={{ ...styles.btnSave, ...(isSaveDisabled ? styles.btnDisabled : {}) }}>{enviando ? 'Guardando...' : 'Guardar Todo'}</SmoothButton>
          </div>
        </CardTransition>
      </form>
    </div>
  );
};

// ... CONSTANTES y ESTILOS (Mismos que los definidos en turnos anteriores para consistencia visual) ...
const COL_AREA_WIDTH = '100px';
const COL_MACHINE_WIDTH = '120px';
const COL_TOTAL_WIDTH = '100px';
const COL_DATA_MIN_WIDTH = '110px';

const baseHeaderStyle = { backgroundColor: colors.gray800, color: colors.surface, padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, textAlign: 'center', borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray700, textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 10, height: '40px', boxSizing: 'border-box' };

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
    height: '42px', 
    width: '100%', 
    justifyContent: 'center' 
  },
  btnUnlocked: { 
    height: '42px', 
    width: '100%', 
    justifyContent: 'center' 
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
  fixedHeaderArea: { 
    ...baseHeaderStyle, 
    left: 0, 
    width: COL_AREA_WIDTH, 
    minWidth: COL_AREA_WIDTH, 
    maxWidth: COL_AREA_WIDTH, 
    zIndex: 20 
  },
  fixedHeaderMachine: { 
    ...baseHeaderStyle, 
    left: COL_AREA_WIDTH, 
    width: COL_MACHINE_WIDTH, 
    minWidth: COL_MACHINE_WIDTH, 
    maxWidth: COL_MACHINE_WIDTH, 
    zIndex: 20 
  },
  tableHeaderCell: { 
    ...baseHeaderStyle, 
    minWidth: COL_DATA_MIN_WIDTH 
  },
  fixedHeaderTotal: { 
    ...baseHeaderStyle, 
    right: 0, 
    width: COL_TOTAL_WIDTH, 
    minWidth: COL_TOTAL_WIDTH, 
    maxWidth: COL_TOTAL_WIDTH, 
    backgroundColor: colors.primary, 
    borderColor: colors.primary, 
    zIndex: 20 
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
    left: 0, width: COL_AREA_WIDTH, 
    minWidth: COL_AREA_WIDTH, 
    maxWidth: COL_AREA_WIDTH, 
    zIndex: 15, 
    height: '48px', 
    boxSizing: 'border-box' 
  },
  machineCell: { 
    padding: spacing.sm, 
    borderWidth: '1px', 
    borderStyle: 'solid', 
    borderColor: colors.gray200, 
    textAlign: 'center', 
    backgroundColor: colors.gray50, 
    position: 'sticky', 
    left: COL_AREA_WIDTH, 
    width: COL_MACHINE_WIDTH, 
    minWidth: COL_MACHINE_WIDTH, 
    maxWidth: COL_MACHINE_WIDTH, 
    zIndex: 15, 
    height: '48px', 
    boxSizing: 'border-box' 
  },
  dataCell: { 
    padding: spacing.xs, 
    borderWidth: '1px',
    borderStyle: 'solid', 
    borderColor: colors.gray200, 
    textAlign: 'center', 
    minWidth: COL_DATA_MIN_WIDTH, 
    height: '48px' 
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
    width: COL_TOTAL_WIDTH, 
    minWidth: COL_TOTAL_WIDTH, 
    maxWidth: COL_TOTAL_WIDTH, 
    zIndex: 15, 
    height: '48px', 
    boxSizing: 'border-box' 
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
  machineText: { 
    fontSize: typography.sizes.sm, 
    color: colors.gray800, 
    fontWeight: typography.weights.semibold 
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
    backgroundColor: colors.info + '20', 
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
  totalValue: { 
    fontSize: typography.sizes.sm, 
    color: colors.gray800 
  },
  totalsRow: { 
    backgroundColor: colors.gray800, 
    color: colors.surface, 
    position: 'sticky', 
    bottom: 0, 
    zIndex: 20, 
    height: '40px' 
  },
  fixedTotalArea: { 
    padding: `${spacing.xs} ${spacing.md}`, 
    borderWidth: '1px', 
    borderStyle: 'solid', 
    borderColor: colors.gray700, 
    textAlign: 'center', 
    position: 'sticky', 
    left: 0, 
    width: `calc(${COL_AREA_WIDTH} + ${COL_MACHINE_WIDTH})`, 
    minWidth: `calc(${COL_AREA_WIDTH} + ${COL_MACHINE_WIDTH})`, 
    maxWidth: `calc(${COL_AREA_WIDTH} + ${COL_MACHINE_WIDTH})`, 
    zIndex: 25, 
    backgroundColor: colors.gray800 
  },
  fixedTotalValue: { 
    padding: `${spacing.xs} ${spacing.md}`, 
    borderWidth: '1px',
    borderStyle: 'solid', 
    borderColor: colors.gray700, 
    textAlign: 'center', 
    backgroundColor: colors.primary, 
    position: 'sticky', 
    right: 0, 
    width: COL_TOTAL_WIDTH, 
    minWidth: COL_TOTAL_WIDTH, 
    maxWidth: COL_TOTAL_WIDTH, 
    zIndex: 25 
  },
  columnTotalCell: { 
    padding: spacing.xs, 
    borderWidth: '1px', 
    borderStyle: 'solid', 
    borderColor: colors.gray700, 
    textAlign: 'center', 
    minWidth: COL_DATA_MIN_WIDTH 
  },
  columnTotalValue: { 
    fontSize: typography.sizes.sm, 
    fontWeight: typography.weights.bold 
  },
  grandTotalValue: { 
    fontSize: typography.sizes.sm, 
    fontWeight: typography.weights.bold 
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
  summaryCount: { 
    fontSize: typography.sizes.xl, 
    fontWeight: typography.weights.bold, 
    color: colors.gray900, 
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent', 
    backgroundClip: 'text' 
  },
  actionButtons: { 
    display: 'flex', 
    gap: spacing.md, 
    alignItems: 'center', 
    flexShrink: 0 
  },
  btnCancel: { 
    height: '52px', 
    padding: `0 ${spacing.lg}`, 
    minWidth: '140px', 
    justifyContent: 'center', 
    borderWidth: '2px', 
    borderRadius: radius.lg, 
    fontSize: typography.sizes.base 
  },    
  btnSave: { 
    height: '52px', 
    padding: `0 ${spacing.lg}`, 
    minWidth: '200px', 
    justifyContent: 'center', 
    borderRadius: radius.lg, 
    fontSize: typography.sizes.base, 
    backgroundColor: colors.success, 
    color: '#fff', ':hover': 
    { 
      backgroundColor: colors.secondaryHover 
    } 
  },
  btnDisabled: { 
    backgroundColor: '#E5E7EB', 
    color: '#6B7280', 
    border: `1px solid ${colors.gray300}`, 
    cursor: 'not-allowed', 
    boxShadow: 'none', 
    opacity: 1, 
    ':hover': { 
      backgroundColor: '#E5E7EB', 
      transform: 'none', 
      boxShadow: 'none' 
    } 
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
  loading: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: spacing.xl, 
    textAlign: 'center', 
    color: colors.gray500, 
    minHeight: '100%', 
    flex: 1 
  }
};

export default RegistroScrapCompleto;