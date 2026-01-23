/* src/components/RegistroScrapCompleto.js */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';
import { useToast } from '../context/ToastContext';
import { storageService } from '../services/storageService';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';
import SmoothButton from './SmoothButton';
import LoadingSpinner from './LoadingSpinner';
import CardTransition from './CardTransition';

const round3 = (num) => {
  return Math.round((parseFloat(num) || 0) * 1000) / 1000;
};

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

// Componente de Fila Optimizado
const ScrapRow = React.memo(({
  fila,
  realIndex,
  materialesFlat,
  campoBasculaActivo,
  celdaActiva,
  pesoBloqueado,
  editingValues,
  onFocus,
  onChange,
  onBlur,
  onKeyPress,
  animate,
  indexDisplay
}) => {
  // Calcular total en tiempo real incluyendo valores en edición
  const totalFila = useMemo(() => {
    let total = 0;
    materialesFlat.forEach(m => {
      const key = `material_${m.id}`;
      const editKey = `${realIndex}_${key}`;
      
      const valor = editingValues[editKey] !== undefined 
        ? (editingValues[editKey] === '' ? 0 : parseFloat(editingValues[editKey]) || 0)
        : (parseFloat(fila[key]) || 0);
      
      total += valor;
    });
    return round3(total);
  }, [fila, realIndex, materialesFlat, editingValues]);

  const estaActiva = celdaActiva?.areaIndex === realIndex;
  const tieneDatos = totalFila > 0;

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

      {materialesFlat.map(mat => {
        const inputKey = `material_${mat.id}`;
        const editKey = `${realIndex}_${inputKey}`;
        const valor =
          editingValues?.[editKey] !== undefined
            ? editingValues[editKey]
            : (fila[inputKey] === 0 ? '' : fila[inputKey]);
        const celdaEstaActiva = estaActiva && campoBasculaActivo === inputKey;
        const tieneValor = valor !== '' && valor !== '0';

        return (
          <td key={mat.id} style={{
            ...styles.dataCell,
            ...(celdaEstaActiva ? styles.activeColumn : {}),
            ...(editingValues?.[editKey] !== undefined ? styles.editingCell : {})
          }}>
            <div style={styles.inputWrapper}>
              <input
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => onChange(realIndex, inputKey, e.target.value)}
                onBlur={() => onBlur(realIndex, inputKey)}
                onKeyPress={(e) => onKeyPress(e, realIndex, inputKey)}
                onClick={() => onFocus(realIndex, inputKey, fila.area_real, fila.maquina_real)}
                onFocus={() => onFocus(realIndex, inputKey, fila.area_real, fila.maquina_real)}
                style={{
                  ...styles.inputCell,
                  ...(tieneValor ? styles.hasData : {}),
                  ...(celdaEstaActiva ? styles.activeInput : {}),
                  ...(pesoBloqueado && celdaEstaActiva ? styles.frozenInput : {}),
                  ...(pesoBloqueado && !celdaEstaActiva ? styles.disabledInput : {}),
                  ...(editingValues?.[editKey] !== undefined ? styles.editingInput : {})
                }}
                placeholder="-"
                readOnly={pesoBloqueado}
              />
            </div>
          </td>
        );
      })}

      <td style={styles.totalCell}>
        <strong style={styles.totalValue}>{totalFila.toFixed(3)}</strong>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  if (prevProps.fila !== nextProps.fila) return false;
  if (prevProps.campoBasculaActivo !== nextProps.campoBasculaActivo) return false;
  if (prevProps.pesoBloqueado !== nextProps.pesoBloqueado) return false;
  if (prevProps.animate !== nextProps.animate) return false;

  const prevActive = prevProps.celdaActiva?.areaIndex === prevProps.realIndex;
  const nextActive = nextProps.celdaActiva?.areaIndex === nextProps.realIndex;
  if (prevActive !== nextActive) return false;

  // 🔑 COMPARAR editingValues DE ESTA FILA
  const prevEditing = Object.keys(prevProps.editingValues || {})
    .filter(k => k.startsWith(`${prevProps.realIndex}_`))
    .map(k => prevProps.editingValues[k])
    .join('|');

  const nextEditing = Object.keys(nextProps.editingValues || {})
    .filter(k => k.startsWith(`${nextProps.realIndex}_`))
    .map(k => nextProps.editingValues[k])
    .join('|');

  return prevEditing === nextEditing;
});

const RegistroScrapCompleto = ({ onRegistroCreado, onCancelar, onLoadComplete }) => {
  const { addToast } = useToast();

  const [config, setConfig] = useState(null);
  const [materialesFlat, setMaterialesFlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tablaData, setTablaData] = useState([]);

  // 🔥 CAMBIO IMPORTANTE: Inicializar con valores del localStorage si existen
  const savedState = storageService.loadDraftData();
  const initialFiltroArea = savedState?.filtroArea || '';
  const initialFiltroMaquina = savedState?.filtroMaquina || '';
  const initialCampoBascula = savedState?.campoBasculaActivo || '';
  
  const [filtroArea, setFiltroArea] = useState(initialFiltroArea);
  const [filtroMaquina, setFiltroMaquina] = useState(initialFiltroMaquina);
  const [campoBasculaActivo, setCampoBasculaActivo] = useState(initialCampoBascula);

  const [pesoBloqueado, setPesoBloqueado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  const [areasDisponibles, setAreasDisponibles] = useState([]);
  const [maquinasDisponibles, setMaquinasDisponibles] = useState([]);

  const initialMaquinaSel = savedState?.maquinaSeleccionada || { area: '', maquina: '', index: null };
  const initialCeldaActiva = savedState?.celdaActiva || null;
  
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(initialMaquinaSel);
  const [celdaActiva, setCeldaActiva] = useState(initialCeldaActiva);

  // Estado para controlar si estamos cargando desde localStorage
  const [loadingFromStorage, setLoadingFromStorage] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  const [editingValues, setEditingValues] = useState({});

  // --- LÓGICA DE TURNO AUTOMÁTICO ---
  const getTurnoActual = () => {
    return storageService.getCurrentTurno();
  };

  const initialFormData = savedState?.formData || {
    turno: getTurnoActual(),
    fecha: storageService.getCurrentDate()
  };
  
  const [formData, setFormData] = useState(initialFormData);

  const maquinaSeleccionadaRef = useRef(maquinaSeleccionada);
  const celdaActivaRef = useRef(celdaActiva);
  const pesoBloqueadoRef = useRef(pesoBloqueado);
  const campoBasculaActivoRef = useRef(campoBasculaActivo);
  const pesoCongeladoRef = useRef(0);
  const lockedTargetRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const hasShownRecoveryToast = useRef(false);
  const isInitialMount = useRef(true);
  const editingTimeoutRef = useRef(null);

  // 🔥 REFS para persistir los valores de los selects
  const filtroAreaRef = useRef(filtroArea);
  const filtroMaquinaRef = useRef(filtroMaquina);
  const campoBasculaActivoRef2 = useRef(campoBasculaActivo);

  useEffect(() => { maquinaSeleccionadaRef.current = maquinaSeleccionada; }, [maquinaSeleccionada]);
  useEffect(() => { celdaActivaRef.current = celdaActiva; }, [celdaActiva]);
  useEffect(() => { pesoBloqueadoRef.current = pesoBloqueado; }, [pesoBloqueado]);
  useEffect(() => { campoBasculaActivoRef.current = campoBasculaActivo; }, [campoBasculaActivo]);
  
  // 🔥 Actualizar refs cuando cambian los estados
  useEffect(() => { filtroAreaRef.current = filtroArea; }, [filtroArea]);
  useEffect(() => { filtroMaquinaRef.current = filtroMaquina; }, [filtroMaquina]);
  useEffect(() => { campoBasculaActivoRef2.current = campoBasculaActivo; }, [campoBasculaActivo]);

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

  // 🔥 FUNCIÓN MODIFICADA: Guardar TODOS los estados importantes
  const saveToStorageOnDemand = useCallback(() => {
    if (tablaData.length === 0) return;

    // Filtrar solo filas que tengan datos
    const filasConDatos = tablaData.filter(fila => fila.peso_total > 0);

    if (filasConDatos.length > 0) {
      const dataToSave = {
        tablaData,
        formData,
        filtroArea: filtroAreaRef.current,
        filtroMaquina: filtroMaquinaRef.current,
        campoBasculaActivo: campoBasculaActivoRef2.current,
        maquinaSeleccionada,
        celdaActiva: celdaActivaRef.current
      };

      const success = storageService.saveDraftDataOnDemand(dataToSave);
      if (success) {
        setShowSavedNotification(true);
        // Ocultar la notificación después de 3 segundos
        setTimeout(() => setShowSavedNotification(false), 3000);
      }
    }
  }, [tablaData, formData, maquinaSeleccionada]);

  // 🔥 FUNCIÓN MODIFICADA: Autoguardado con estados actuales
  const autoSaveToStorage = useCallback(() => {
    if (tablaData.length === 0) return;

    // Filtrar solo filas que tengan datos
    const filasConDatos = tablaData.filter(fila => fila.peso_total > 0);

    if (filasConDatos.length > 0) {
      const dataToSave = {
        tablaData,
        formData,
        filtroArea: filtroAreaRef.current,
        filtroMaquina: filtroMaquinaRef.current,
        campoBasculaActivo: campoBasculaActivoRef2.current,
        maquinaSeleccionada,
        celdaActiva: celdaActivaRef.current
      };

      storageService.saveDraftDataAuto(dataToSave);
    }
  }, [tablaData, formData, maquinaSeleccionada]);

  // 🔥 FUNCIÓN MODIFICADA: Cargar estados persistentes
  const loadFromStorage = useCallback(() => {
    const savedData = storageService.loadDraftData();
    if (savedData) {
      setLoadingFromStorage(true);

      // 🔥 Restaurar TODOS los estados importantes
      if (savedData.formData) {
        setFormData(savedData.formData);
      }

      if (savedData.filtroArea) {
        setFiltroArea(savedData.filtroArea);
        filtroAreaRef.current = savedData.filtroArea;
      }

      if (savedData.filtroMaquina) {
        setFiltroMaquina(savedData.filtroMaquina);
        filtroMaquinaRef.current = savedData.filtroMaquina;
      }

      if (savedData.campoBasculaActivo) {
        setCampoBasculaActivo(savedData.campoBasculaActivo);
        campoBasculaActivoRef2.current = savedData.campoBasculaActivo;
      }

      if (savedData.maquinaSeleccionada) {
        setMaquinaSeleccionada(savedData.maquinaSeleccionada);
      }

      if (savedData.celdaActiva) {
        setCeldaActiva(savedData.celdaActiva);
      }

      // Los datos de tabla se cargarán después de inicializar la estructura
      return savedData.tablaData;
    }
    return null;
  }, []);

  // Cuando el componente se monta (modal se abre)
  useEffect(() => {
    // Marcar que el modal está abierto
    storageService.markModalOpened();

    let mounted = true;
    const initData = async () => {
      try {
        const configData = await apiClient.getRegistrosConfig();
        if (!mounted) return;

        setConfig(configData);

        let flatMats = [];
        if (configData.tipos_scrap) {
          if (Array.isArray(configData.tipos_scrap)) {
            flatMats = configData.tipos_scrap;
          } else {
            Object.values(configData.tipos_scrap).forEach(grupo => {
              flatMats = [...flatMats, ...grupo];
            });
          }

          flatMats.sort((a, b) => a.orden - b.orden);
          setMaterialesFlat(flatMats);

          // 🔥 IMPORTANTE: Si no hay campo activo desde localStorage, usar el primero
          if (flatMats.length > 0 && !campoBasculaActivoRef2.current) {
            const primerMaterial = `material_${flatMats[0].id}`;
            setCampoBasculaActivo(primerMaterial);
            campoBasculaActivoRef2.current = primerMaterial;
          }
        }

        if (configData?.areas_maquinas) {
          const data = [];
          const areas = [];

          Object.entries(configData.areas_maquinas).forEach(([areaNombre, maquinas]) => {
            areas.push(areaNombre);
            maquinas.forEach(maquina => {
              const row = {
                area_real: areaNombre,
                maquina_real: maquina.maquina_nombre,
                peso_total: 0,
                conexion_bascula: false
              };
              flatMats.forEach(m => {
                row[`material_${m.id}`] = 0;
              });
              data.push(row);
            });
          });

          // Cargar datos guardados después de crear la estructura
          const savedTablaData = loadFromStorage();
          if (savedTablaData) {
            // Combinar datos guardados con la estructura
            const mergedData = data.map((row, index) => {
              const savedRow = savedTablaData.find(
                s => s.area_real === row.area_real && s.maquina_real === row.maquina_real
              );
              if (savedRow) {
                return {
                  ...row,
                  ...savedRow,
                  // Asegurar que todos los campos de materiales existan
                  ...flatMats.reduce((acc, m) => {
                    const key = `material_${m.id}`;
                    acc[key] = savedRow[key] || 0;
                    return acc;
                  }, {})
                };
              }
              return row;
            });
            setTablaData(mergedData);

            // Mostrar notificación de datos recuperados SOLO la primera vez
            if (!hasShownRecoveryToast.current) {
              setTimeout(() => {
                addToast('Datos recuperados de la sesión anterior', 'info');
                hasShownRecoveryToast.current = true;
              }, 1000);
            }
          } else {
            setTablaData(data);
          }

          setAreasDisponibles(areas);
          
          // 🔥 IMPORTANTE: Si hay filtro de área cargado, actualizar máquinas disponibles
          if (initialFiltroArea && configData.areas_maquinas[initialFiltroArea]) {
            const maquinas = configData.areas_maquinas[initialFiltroArea].map(m => m.maquina_nombre) || [];
            setMaquinasDisponibles(maquinas);
          }
        }
      } catch (error) {
        if (mounted) addToast('Error cargando configuración: ' + error.message, 'error');
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingFromStorage(false);
          if (onLoadComplete) onLoadComplete();
          setTimeout(() => setTriggerAnimation(true), 150);
          isInitialMount.current = false;
        }
      }
    };

    // Verificar si ha cambiado el turno al montar el componente
    if (storageService.hasTurnoChanged()) {
      storageService.clearDraftData();
      storageService.updateCurrentSession();
    }

    initData();
    return () => {
      mounted = false;
    };
  }, [addToast, onLoadComplete, loadFromStorage, initialFiltroArea]);

  // 🔥 USE EFFECT MODIFICADO: Actualizar máquinas disponibles cuando cambia el área
  useEffect(() => {
    if (!config?.areas_maquinas) {
      setMaquinasDisponibles([]);
      return;
    }
    
    const maquinas = config.areas_maquinas[filtroArea]?.map(m => m.maquina_nombre) || [];
    setMaquinasDisponibles(maquinas);
    
    // 🔥 IMPORTANTE: Si hay solo una máquina en el área, seleccionarla automáticamente
    if (maquinas.length === 1 && !filtroMaquina) {
      const maquinaUnica = maquinas[0];
      setFiltroMaquina(maquinaUnica);
      filtroMaquinaRef.current = maquinaUnica;
      
      // También actualizar la máquina seleccionada
      const index = tablaData.findIndex(r => r.area_real === filtroArea && r.maquina_real === maquinaUnica);
      if (index !== -1) {
        setMaquinaSeleccionada({ area: filtroArea, maquina: maquinaUnica, index });
        setCeldaActiva({ areaIndex: index, campo: campoBasculaActivoRef2.current });
      }
    } else if (filtroArea && !filtroMaquina && maquinaSeleccionada.area === filtroArea) {
      // 🔥 Si el área coincide con la máquina seleccionada, mantener la máquina
      setFiltroMaquina(maquinaSeleccionada.maquina);
      filtroMaquinaRef.current = maquinaSeleccionada.maquina;
    }
  }, [filtroArea, config, filtroMaquina, maquinaSeleccionada, tablaData]);

  // 🔥 USE EFFECT MODIFICADO: Sincronizar selección de máquina con filtros
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

  const handleCellFocus = useCallback((areaIndex, campo, area, maquina) => {
    // 🔥 IMPORTANTE: Actualizar TODOS los estados relacionados
    setCeldaActiva({ areaIndex, campo });
    setCampoBasculaActivo(campo);
    campoBasculaActivoRef2.current = campo;
    
    setMaquinaSeleccionada({ area, maquina, index: areaIndex });
    setFiltroArea(area);
    filtroAreaRef.current = area;
    setFiltroMaquina(maquina);
    filtroMaquinaRef.current = maquina;
  }, []);

  // FUNCIÓN PARA MANEJAR TECLA ENTER
  const handleKeyPress = useCallback((e, areaIndex, campo) => {
    if (e.key === 'Enter') {
      // Cuando se presiona Enter, forzar el blur para guardar el valor
      e.target.blur();
    }
  }, []);

  const handleInputChangeTabla = useCallback((areaIndex, campo, valor) => {
    const key = `${areaIndex}_${campo}`;
    
    // Validar que sea un número válido
    if (valor === '' || valor === null || valor === undefined) {
      setEditingValues(prev => ({
        ...prev,
        [key]: ''
      }));
      return;
    }

    // Permitir solo números y punto decimal
    const regex = /^-?\d*\.?\d*$/;
    if (regex.test(valor)) {
      setEditingValues(prev => ({
        ...prev,
        [key]: valor
      }));
    }
  }, []);

  const handleInputBlur = useCallback((areaIndex, campo) => {
    const key = `${areaIndex}_${campo}`;
    const rawValue = editingValues[key];

    // Si no hay valor editado, no hacer nada
    if (rawValue === undefined || rawValue === '') return;

    const val = round3(parseFloat(rawValue) || 0);

    setTablaData(prev => {
      const newData = [...prev];
      const filaActualizada = { ...newData[areaIndex] };

      // Actualizar el valor en la fila
      filaActualizada[campo] = val;

      // Recalcular el total de la fila
      let total = 0;
      materialesFlat.forEach(m => {
        const matKey = `material_${m.id}`;
        const valor = matKey === campo ? val : (filaActualizada[matKey] || 0);
        total += parseFloat(valor) || 0;
      });

      filaActualizada.peso_total = round3(total);
      filaActualizada.conexion_bascula = false;

      newData[areaIndex] = filaActualizada;
      return newData;
    });

    // Limpiar el valor de edición
    setEditingValues(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    // 🔥 Guardar automáticamente con estados actualizados
    const dataToSave = {
      tablaData,
      formData,
      filtroArea: filtroAreaRef.current,
      filtroMaquina: filtroMaquinaRef.current,
      campoBasculaActivo: campoBasculaActivoRef2.current,
      maquinaSeleccionada,
      celdaActiva: celdaActivaRef.current
    };
    
    storageService.saveDraftDataAuto(dataToSave);
  }, [editingValues, tablaData, formData, maquinaSeleccionada, materialesFlat]);

  const handlePesoFromBascula = useCallback((pesoInput, campoDestinoEnviado, esAutomatico) => {
    const currentBloqueado = pesoBloqueadoRef.current;
    const currentMaquinaSel = maquinaSeleccionadaRef.current;
    const currentCelda = celdaActivaRef.current;
    const campoRealActivo = campoBasculaActivoRef.current;

    if (campoDestinoEnviado && campoDestinoEnviado !== campoRealActivo) return;

    const campoDestino = campoRealActivo;
    if (!campoDestino) return;

    let targetIndex = -1;
    if (currentMaquinaSel.index !== null) {
      targetIndex = currentMaquinaSel.index;
    } else if (currentCelda && currentCelda.areaIndex !== undefined) {
      targetIndex = currentCelda.areaIndex;
    }

    if (currentBloqueado && lockedTargetRef.current) {
      const locked = lockedTargetRef.current;
      if (locked.index !== targetIndex || locked.field !== campoDestino) return;
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
        if (Math.abs(valorActual - nuevoValor) < 0.0001) return prevData;

        const newData = [...prevData];
        const filaActualizada = { ...newData[targetIndex] };

        filaActualizada[campoDestino] = nuevoValor;
        filaActualizada.conexion_bascula = esAutomatico;

        // Recalcular el total de la fila
        let total = 0;
        materialesFlat.forEach(m => {
          const key = `material_${m.id}`;
          const valor = key === campoDestino ? nuevoValor : (filaActualizada[key] || 0);
          total += parseFloat(valor) || 0;
        });
        
        filaActualizada.peso_total = round3(total);

        newData[targetIndex] = filaActualizada;
        return newData;
      });

      // Limpiar valor de edición para esta celda
      const editKey = `${targetIndex}_${campoDestino}`;
      setEditingValues(prev => {
        const copy = { ...prev };
        delete copy[editKey];
        return copy;
      });

      // 🔥 Guardar automáticamente con estados actuales
      setTimeout(() => {
        const dataToSave = {
          tablaData,
          formData,
          filtroArea: filtroAreaRef.current,
          filtroMaquina: filtroMaquinaRef.current,
          campoBasculaActivo: campoBasculaActivoRef2.current,
          maquinaSeleccionada,
          celdaActiva: celdaActivaRef.current
        };
        
        storageService.saveDraftDataAuto(dataToSave);
      }, 100);
    }
  }, [tablaData, formData, maquinaSeleccionada, materialesFlat]);

  // Función para manejar el botón de CAPTURAR/LEER PESO
  const handleTogglePesoBloqueado = () => {
    const newPesoBloqueado = !pesoBloqueado;
    setPesoBloqueado(newPesoBloqueado);

    // Si se está presionando el botón para CONGELAR (activando la CAPTURAR)
    if (!newPesoBloqueado) {
      // Guardar datos cuando se presiona "CAPTURAR"
      saveToStorageOnDemand();
    }
  };

  const handleMaterialChange = (newMaterialKey) => {
    setCampoBasculaActivo(newMaterialKey);
    campoBasculaActivoRef2.current = newMaterialKey;
    
    if (celdaActiva && celdaActiva.areaIndex !== null) {
      setCeldaActiva(prev => ({ ...prev, campo: newMaterialKey }));
    }
  };

  const limpiarFiltros = () => {
    setFiltroArea('');
    setFiltroMaquina('');
    filtroAreaRef.current = '';
    filtroMaquinaRef.current = '';
    
    setMaquinaSeleccionada({ area: '', maquina: '', index: null });
    setCeldaActiva(null);
  };

  // 🔥 FUNCIÓN MODIFICADA: Cambiar área con manejo de refs
  const handleAreaChange = (e) => {
    const nuevaArea = e.target.value;
    setFiltroArea(nuevaArea);
    filtroAreaRef.current = nuevaArea;
    
    // Si cambia el área, limpiar la máquina seleccionada
    if (nuevaArea !== maquinaSeleccionada.area) {
      setFiltroMaquina('');
      filtroMaquinaRef.current = '';
    }
  };

  // 🔥 FUNCIÓN MODIFICADA: Cambiar máquina con manejo de refs
  const handleMaquinaChange = (e) => {
    const nuevaMaquina = e.target.value;
    setFiltroMaquina(nuevaMaquina);
    filtroMaquinaRef.current = nuevaMaquina;
  };

  // 🔥 FUNCIÓN MODIFICADA: Cambiar fecha con manejo de refs
  const handleFechaChange = (e) => {
    const newFecha = e.target.value;
    setFormData(prev => ({ ...prev, fecha: newFecha }));

    // Verificar si cambió la fecha para limpiar datos antiguos
    if (newFecha !== storageService.getCurrentDate()) {
      storageService.clearDraftData();
      storageService.updateCurrentSession();
    }
  };

  // 🔥 FUNCIÓN MODIFICADA: Cambiar turno con manejo de refs
  const handleTurnoChange = (e) => {
    const newTurno = e.target.value;
    setFormData(prev => ({ ...prev, turno: newTurno }));

    // Verificar si cambió el turno para limpiar datos antiguos
    if (newTurno !== storageService.getCurrentTurno()) {
      storageService.clearDraftData();
      storageService.updateCurrentSession();
    }
  };

  // 🔥 FUNCIÓN MODIFICADA: Guardado masivo optimizado
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
      // 🔥 OPTIMIZADO: Usar batch para muchos registros
      if (filasConPeso.length > 10) {
        // Para muchos registros, usar batch
        const datosBatch = filasConPeso.map(fila => {
          const detalles = [];
          materialesFlat.forEach(mat => {
            const key = `material_${mat.id}`;
            const peso = fila[key];
            if (peso > 0) {
              detalles.push({
                id: mat.id,
                peso: peso
              });
            }
          });

          return {
            turno: formData.turno,
            area_real: fila.area_real,
            maquina_real: fila.maquina_real,
            conexion_bascula: fila.conexion_bascula || false,
            numero_lote: `LOTE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            observaciones: 'Registro masivo',
            detalles: detalles
          };
        });
        
        // 🔥 USAR BATCH
        const resultado = await apiClient.createRegistroScrapBatch(datosBatch);
        
        if (resultado.success) {
          // Limpiar localStorage después de enviar exitosamente
          storageService.clearDraftData();
          storageService.markModalClosed();

          addToast(`Se guardaron exitosamente ${resultado.count_exitosos} registros${resultado.count_fallidos > 0 ? `, ${resultado.count_fallidos} fallaron` : ''}`, 'success');
          
          if (onRegistroCreado) {
            onRegistroCreado();
          }
        } else {
          throw new Error(resultado.message || 'Error en guardado batch');
        }
        
      } else {
        // Para pocos registros, usar método normal
        const promises = filasConPeso.map(fila => {
          const detalles = [];
          materialesFlat.forEach(mat => {
            const key = `material_${mat.id}`;
            const peso = fila[key];
            if (peso > 0) {
              detalles.push({
                id: mat.id,
                peso: peso
              });
            }
          });

          const datosEnvio = {
            turno: formData.turno,
            area_real: fila.area_real,
            maquina_real: fila.maquina_real,
            conexion_bascula: fila.conexion_bascula || false,
            numero_lote: `LOTE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            observaciones: 'Registro masivo',
            detalles: detalles
          };
          return apiClient.createRegistroScrap(datosEnvio);
        });

        await Promise.all(promises);

        // Limpiar localStorage después de enviar exitosamente
        storageService.clearDraftData();
        storageService.markModalClosed();

        addToast(`Se guardaron exitosamente ${filasConPeso.length} registros`, 'success');
        
        if (onRegistroCreado) {
          onRegistroCreado();
        }
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      addToast(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setEnviando(false);
    }
  };

  // Modificar el botón de cancelar
  const handleCancelar = () => {
    const tieneDatos = tablaData.some(fila => fila.peso_total > 0);

    if (tieneDatos) {
      if (window.confirm('¿Desea guardar los datos para continuar después? Los datos se guardarán automáticamente al presionar "CAPTURAR".')) {
        // Solo marcar como cerrado
        storageService.markModalClosed();
        onCancelar();
      } else {
        // Limpiar datos si el usuario no quiere guardarlos
        storageService.clearDraftData();
        onCancelar();
      }
    } else {
      storageService.markModalClosed();
      onCancelar();
    }
  };

  // Función para limpiar manualmente los datos guardados
  const handleClearStorage = () => {
    if (window.confirm('¿Está seguro de que desea eliminar todos los datos guardados temporalmente?')) {
      storageService.clearDraftData();
      // Reiniciar la tabla a valores por defecto
      setTablaData(prev => prev.map(fila => ({
        ...fila,
        peso_total: 0,
        ...materialesFlat.reduce((acc, m) => {
          acc[`material_${m.id}`] = 0;
          return acc;
        }, {})
      })));
      addToast('Datos temporales eliminados', 'info');
    }
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, []);

  const datosFiltrados = useMemo(() => {
    return tablaData.filter(fila => {
      if (filtroArea && fila.area_real !== filtroArea) return false;
      return true;
    });
  }, [tablaData, filtroArea]);

  const totales = useMemo(() => {
    const acc = {};
    materialesFlat.forEach(m => acc[`material_${m.id}`] = 0);
    let generalInt = 0;

    tablaData.forEach((fila, rowIndex) => {
      materialesFlat.forEach(m => {
        const key = `material_${m.id}`;
        const editKey = `${rowIndex}_${key}`;
        
        // Usar valor en edición si existe, de lo contrario usar valor de la fila
        const valor = editingValues[editKey] !== undefined 
          ? (editingValues[editKey] === '' ? 0 : parseFloat(editingValues[editKey]) || 0)
          : (parseFloat(fila[key]) || 0);
        
        acc[key] = (acc[key] || 0) + Math.round(valor * 1000);
      });
      
      // Calcular total de fila considerando valores en edición
      let filaTotal = 0;
      materialesFlat.forEach(m => {
        const key = `material_${m.id}`;
        const editKey = `${rowIndex}_${key}`;
        
        const valor = editingValues[editKey] !== undefined 
          ? (editingValues[editKey] === '' ? 0 : parseFloat(editingValues[editKey]) || 0)
          : (parseFloat(fila[key]) || 0);
        
        filaTotal += valor;
      });
      
      generalInt += Math.round(round3(filaTotal) * 1000);
    });

    Object.keys(acc).forEach(key => acc[key] = acc[key] / 1000);
    acc.general = generalInt / 1000;

    return acc;
  }, [tablaData, materialesFlat, editingValues]);

  if (loading) {
    return <div style={styles.loading}><LoadingSpinner message="Cargando configuración..." /></div>;
  }

  const numFilasConPeso = tablaData.filter(fila => fila.peso_total > 0).length;
  const isSaveDisabled = enviando || !formData.turno || numFilasConPeso === 0;
  const hasSavedData = storageService.hasDraftData();

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

            {/* Notificación de guardado manual */}
            {showSavedNotification && (
              <div style={{
                backgroundColor: colors.success + '20',
                border: `1px solid ${colors.success}`,
                borderRadius: radius.sm,
                padding: spacing.sm,
                marginBottom: spacing.md,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                animation: 'fadeIn 0.3s ease'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span style={{ fontSize: typography.sizes.sm, color: colors.success }}>
                  Datos guardados manualmente
                </span>
              </div>
            )}

            {/* Indicador de datos recuperados */}
            {loadingFromStorage && (
              <div style={{
                backgroundColor: colors.info + '20',
                border: `1px solid ${colors.info}`,
                borderRadius: radius.sm,
                padding: spacing.sm,
                marginBottom: spacing.md,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.info} strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span style={{ fontSize: typography.sizes.sm, color: colors.info }}>
                  Recuperando datos de la sesión anterior...
                </span>
              </div>
            )}

            {hasSavedData && !loadingFromStorage && (
              <div style={{
                backgroundColor: colors.success + '15',
                border: `1px solid ${colors.success}30`,
                borderRadius: radius.sm,
                padding: spacing.sm,
                marginBottom: spacing.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  <span style={{ fontSize: typography.sizes.sm, color: colors.success }}>
                    Hay datos guardados de sesiones anteriores
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearStorage}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.error,
                    cursor: 'pointer',
                    fontSize: typography.sizes.xs,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: radius.sm,
                    ':hover': {
                      backgroundColor: colors.error + '15'
                    }
                  }}
                  title="Eliminar datos guardados"
                >
                  Limpiar
                </button>
              </div>
            )}

            <div style={styles.configGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={handleFechaChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Turno *</label>
                <select
                  value={formData.turno}
                  onChange={handleTurnoChange}
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
                  {materialesFlat.map(m => (
                    <option key={m.id} value={`material_${m.id}`}>{m.tipo_nombre}</option>
                  ))}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Filtrar por Área</label>
                <select 
                  value={filtroArea} 
                  onChange={handleAreaChange}
                  style={styles.select}
                >
                  <option value="">Todas las áreas</option>
                  {areasDisponibles.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Seleccionar Máquina</label>
                <select 
                  value={filtroMaquina} 
                  onChange={handleMaquinaChange}
                  style={styles.select} 
                  disabled={!filtroArea}
                >
                  <option value="">Seleccionar...</option>
                  {maquinasDisponibles.map(maquina => <option key={maquina} value={maquina}>{maquina}</option>)}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Controles</label>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <SmoothButton
                    type="button"
                    onClick={handleTogglePesoBloqueado}
                    style={{
                      ...(pesoBloqueado ? styles.btnLocked : styles.btnUnlocked),
                      flex: 1, height: '42px', width: 'auto', fontSize: '0.7rem', padding: '0 4px'
                    }}
                    variant={pesoBloqueado ? 'destructive' : 'primary'}
                    title={pesoBloqueado ? "Peso CAPTURADO - Presione para descongelar" : "Presione para leer peso y guardar datos"}
                  >
                    {pesoBloqueado ? 'LEER PESO' : 'CAPTURAR'}
                  </SmoothButton>

                  <SmoothButton
                    type="button"
                    onClick={limpiarFiltros}
                    variant="secondary"
                    disabled={!filtroArea && !filtroMaquina}
                    style={{ flex: 1, height: '42px', width: 'auto', justifyContent: 'center', fontSize: '0.7rem', padding: '0 4px' }}
                    title="Limpiar filtros de área y máquina"
                  >
                    REINICIAR FILTROS
                  </SmoothButton>
                </div>
                {!pesoBloqueado && (
                  <p style={{
                    fontSize: typography.sizes.xs,
                    color: colors.info,
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    Presione CAPTURAR para guardar los datos
                  </p>
                )}
              </div>
            </div>

            <div style={{ ...styles.inputGroup, marginTop: spacing.md }}>
              <label style={styles.label}>Máquina Fijada</label>
              <div style={styles.fixedMachineDisplay}>
                {maquinaSeleccionada.maquina ? (
                  <>
                    <strong style={styles.fixedMachineName}>{maquinaSeleccionada.maquina}</strong>
                    <span style={{ ...styles.fixedMachineArea, backgroundColor: colors.primary, color: '#fff', marginLeft: '4px', border: 'none', minWidth: '70px', textAlign: 'center' }}>
                      {(maquinaSeleccionada.index !== null && tablaData[maquinaSeleccionada.index] && tablaData[maquinaSeleccionada.index][campoBasculaActivo]
                        ? tablaData[maquinaSeleccionada.index][campoBasculaActivo].toFixed(3)
                        : '0.000')} kg
                    </span>
                    <span style={styles.fixedMachineArea}>{maquinaSeleccionada.area}</span>
                    <button
                      type="button"
                      onClick={() => { 
                        setMaquinaSeleccionada({ area: '', maquina: '', index: null }); 
                        setCeldaActiva(null);
                        setFiltroArea('');
                        setFiltroMaquina('');
                        filtroAreaRef.current = '';
                        filtroMaquinaRef.current = '';
                      }}
                      style={styles.unfixButton}
                      title="Liberar máquina"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.error }}>
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
          </CardTransition>
        </div>

        <CardTransition delay={200} style={styles.dataSection}>
          <div style={styles.tableHeader}>
            <div style={styles.tableTitleSection}>
              <h3 style={styles.sectionTitle}>Datos de Producción</h3>
              <p style={styles.tableSubtitle}>{filtroArea ? `Área: ${filtroArea}` : 'Todas las áreas'}{filtroMaquina ? ` | Seleccionada: ${filtroMaquina}` : ''}</p>
            </div>
            <div style={styles.stats}>
              <div style={styles.statItem}><span style={styles.statLabel}>Máquinas</span><strong style={styles.statValue}><AnimatedCounter value={datosFiltrados.length} duration={500} decimals={0} /></strong></div>
              <div style={styles.statItem}><span style={styles.statLabel}>Con Datos</span><strong style={{ ...styles.statValue, color: colors.success }}><AnimatedCounter value={numFilasConPeso} duration={500} decimals={0} /></strong></div>
              <div style={styles.statItem}><span style={styles.statLabel}>Total Kg</span><strong style={{ ...styles.statValue, color: colors.primary }}><AnimatedCounter value={totales.general} decimals={3} /></strong></div>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.fixedHeaderArea}>ÁREA</th>
                  <th style={styles.fixedHeaderMachine}>MÁQUINA</th>
                  {materialesFlat.map(mat => {
                    const key = `material_${mat.id}`;
                    return (
                      <th key={mat.id} style={{ ...styles.tableHeaderCell, ...(campoBasculaActivo === key ? styles.activeColumnHeader : {}) }}>
                        <div style={styles.columnHeader}>
                          <span style={styles.columnName}>{mat.tipo_nombre}</span>
                          {campoBasculaActivo === key && <div style={styles.activeColumnIndicator}></div>}
                        </div>
                      </th>
                    );
                  })}
                  <th style={styles.fixedHeaderTotal}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((fila, index) => {
                  const realIndex = tablaData.findIndex(item => item.area_real === fila.area_real && item.maquina_real === fila.maquina_real);
                  return (
                    <ScrapRow
                      key={`${fila.area_real}-${fila.maquina_real}`}
                      fila={fila}
                      realIndex={realIndex}
                      materialesFlat={materialesFlat}
                      campoBasculaActivo={campoBasculaActivo}
                      celdaActiva={celdaActiva}
                      pesoBloqueado={pesoBloqueado}
                      onFocus={handleCellFocus}
                      onChange={handleInputChangeTabla}
                      onBlur={handleInputBlur}
                      onKeyPress={handleKeyPress}
                      editingValues={editingValues}
                      animate={triggerAnimation}
                      indexDisplay={index}
                    />
                  );
                })}
                <tr style={styles.totalsRow}>
                  <td style={styles.fixedTotalArea} colSpan="2">TOTALES</td>
                  {materialesFlat.map(mat => (
                    <td key={mat.id} style={styles.columnTotalCell}>
                      <strong style={styles.columnTotalValue}><AnimatedCounter value={totales[`material_${mat.id}`]} duration={500} decimals={3} /></strong>
                    </td>
                  ))}
                  <td style={styles.fixedTotalValue}><strong style={styles.grandTotalValue}><AnimatedCounter value={totales.general} decimals={3} /></strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardTransition>

        <CardTransition delay={300} style={styles.actions}>
          <div style={styles.summary}>
            <span style={styles.summaryCount}>
              <AnimatedCounter value={numFilasConPeso} duration={500} decimals={0} /> registros listos |
              Total: <AnimatedCounter value={totales.general} decimals={3} /> kg
              {hasSavedData && (
                <span style={{
                  marginLeft: spacing.sm,
                  fontSize: typography.sizes.xs,
                  color: colors.info,
                  backgroundColor: colors.info + '15',
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: radius.sm
                }}>
                  ⚡ Datos guardados
                </span>
              )}
            </span>
          </div>
          <div style={styles.actionButtons}>
            <SmoothButton
              type="button"
              onClick={handleCancelar}
              style={styles.btnCancel}
              variant="secondary"
            >
              Cancelar
            </SmoothButton>
            <SmoothButton
              type="submit"
              disabled={isSaveDisabled}
              style={{ ...styles.btnSave, ...(isSaveDisabled ? styles.btnDisabled : {}) }}
            >
              {enviando ? 'Guardando...' : 'Guardar Todo'}
            </SmoothButton>
          </div>
        </CardTransition>
      </form>
    </div>
  );
};

// Estilos IDÉNTICOS al original con algunas mejoras
const COL_AREA_WIDTH = '100px';
const COL_MACHINE_WIDTH = '120px';
const COL_TOTAL_WIDTH = '100px';
const COL_DATA_MIN_WIDTH = '110px';

const baseHeaderStyle = { backgroundColor: colors.gray800, color: colors.surface, padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, textAlign: 'center', borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray700, textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 10, height: '40px', boxSizing: 'border-box' };

const styles = {
  container: { padding: spacing.lg, backgroundColor: colors.background, minHeight: '100vh', fontFamily: typography.fontFamily },
  form: { display: 'flex', flexDirection: 'column', gap: spacing.xl },
  controls: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: spacing.lg, alignItems: 'start' },
  section: { ...baseComponents.card, padding: spacing.lg },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.gray700, margin: `0 0 ${spacing.md} 0` },
  configGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.md, alignItems: 'start' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: spacing.xs, minHeight: '80px' },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.gray700, marginBottom: spacing.xs, height: '20px' },
  input: { ...baseComponents.input, height: '42px' },
  select: { ...baseComponents.select, height: '42px', paddingRight: '40px' },
  selectPrimary: { ...baseComponents.select, height: '42px', borderWidth: '2px', borderColor: colors.primary, backgroundColor: colors.primaryLight, paddingRight: '40px' },
  btnLocked: { height: '42px', width: '100%', justifyContent: 'center' },
  btnUnlocked: { height: '42px', width: '100%', justifyContent: 'center' },
  dataSection: { ...baseComponents.card, padding: spacing.lg },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md, flexWrap: 'wrap', gap: spacing.md },
  tableTitleSection: { flex: 1 },
  tableSubtitle: { fontSize: typography.sizes.sm, color: colors.gray600, marginTop: spacing.xs },
  stats: { display: 'flex', gap: spacing.md },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.gray50, borderRadius: radius.md, minWidth: '70px' },
  statLabel: { fontSize: typography.sizes.xs, color: colors.gray600, fontWeight: typography.weights.semibold, textTransform: 'uppercase' },
  statValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  tableContainer: { overflow: 'auto', maxHeight: '600px', borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray200, borderRadius: radius.md, boxShadow: shadows.sm },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1200px', backgroundColor: colors.surface },
  fixedHeaderArea: { ...baseHeaderStyle, left: 0, width: COL_AREA_WIDTH, minWidth: COL_AREA_WIDTH, maxWidth: COL_AREA_WIDTH, zIndex: 20 },
  fixedHeaderMachine: { ...baseHeaderStyle, left: COL_AREA_WIDTH, width: COL_MACHINE_WIDTH, minWidth: COL_MACHINE_WIDTH, maxWidth: COL_MACHINE_WIDTH, zIndex: 20 },
  tableHeaderCell: { ...baseHeaderStyle, minWidth: COL_DATA_MIN_WIDTH },
  fixedHeaderTotal: { ...baseHeaderStyle, right: 0, width: COL_TOTAL_WIDTH, minWidth: COL_TOTAL_WIDTH, maxWidth: COL_TOTAL_WIDTH, backgroundColor: colors.primary, borderColor: colors.primary, zIndex: 20 },
  activeColumnHeader: { backgroundColor: colors.primary, borderColor: colors.primary },
  columnHeader: { display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', justifyContent: 'center', height: '100%' },
  columnName: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, lineHeight: 1.2 },
  activeColumnIndicator: { width: '3px', height: '3px', backgroundColor: colors.surface, borderRadius: '50%', marginTop: '1px' },
  tableRow: { borderBottom: `1px solid ${colors.gray200}`, transition: 'all 0.2s ease', ':hover': { backgroundColor: colors.gray50 } },
  activeRow: { backgroundColor: colors.primaryLight, borderLeft: `3px solid ${colors.primary}` },
  dataRow: { backgroundColor: colors.secondaryLight + '15' },
  editingCell: { backgroundColor: colors.warning + '10' },
  areaCell: { padding: spacing.sm, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray200, textAlign: 'center', backgroundColor: colors.gray50, position: 'sticky', left: 0, width: COL_AREA_WIDTH, minWidth: COL_AREA_WIDTH, maxWidth: COL_AREA_WIDTH, zIndex: 15, height: '48px', boxSizing: 'border-box' },
  machineCell: { padding: spacing.sm, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray200, textAlign: 'center', backgroundColor: colors.gray50, position: 'sticky', left: COL_AREA_WIDTH, width: COL_MACHINE_WIDTH, minWidth: COL_MACHINE_WIDTH, maxWidth: COL_MACHINE_WIDTH, zIndex: 15, height: '48px', boxSizing: 'border-box' },
  dataCell: { padding: spacing.xs, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray200, textAlign: 'center', minWidth: COL_DATA_MIN_WIDTH, height: '48px' },
  totalCell: { padding: spacing.sm, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray200, textAlign: 'center', backgroundColor: colors.gray50, fontWeight: typography.weights.semibold, position: 'sticky', right: 0, width: COL_TOTAL_WIDTH, minWidth: COL_TOTAL_WIDTH, maxWidth: COL_TOTAL_WIDTH, zIndex: 15, height: '48px', boxSizing: 'border-box' },
  areaContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs },
  areaText: { fontSize: typography.sizes.sm, color: colors.gray700, fontWeight: typography.weights.semibold, textTransform: 'uppercase' },
  activePulse: { width: '5px', height: '5px', backgroundColor: colors.primary, borderRadius: '50%', animation: 'pulse 1.5s infinite' },
  machineText: { fontSize: typography.sizes.sm, color: colors.gray800, fontWeight: typography.weights.semibold },
  activeColumn: { backgroundColor: colors.primaryLight + '20' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
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
      boxShadow: `0 0 0 2px ${colors.primaryLight}`,
      backgroundColor: colors.primaryLight + '20'
    }
  },
  editingInput: {
    borderStyle: 'dashed',
    borderColor: colors.warning,
    backgroundColor: colors.warning + '10'
  },
  frozenInput: { backgroundColor: colors.info + '20', borderColor: colors.info, color: colors.gray800, fontWeight: 'bold' },
  hasData: { backgroundColor: colors.secondaryLight, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.secondary, color: colors.gray800, fontWeight: typography.weights.bold },
  activeInput: { borderColor: colors.primary, boxShadow: `0 0 0 2px ${colors.primaryLight}`, backgroundColor: colors.primaryLight },
  disabledInput: { backgroundColor: colors.gray100, color: colors.gray500, cursor: 'not-allowed' },
  totalValue: { fontSize: typography.sizes.sm, color: colors.gray800 },
  totalsRow: { backgroundColor: colors.gray800, color: colors.surface, position: 'sticky', bottom: 0, zIndex: 20, height: '40px' },
  fixedTotalArea: { padding: `${spacing.xs} ${spacing.md}`, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray700, textAlign: 'center', position: 'sticky', left: 0, width: `calc(${COL_AREA_WIDTH} + ${COL_MACHINE_WIDTH})`, minWidth: `calc(${COL_AREA_WIDTH} + ${COL_MACHINE_WIDTH})`, maxWidth: `calc(${COL_AREA_WIDTH} + ${COL_MACHINE_WIDTH})`, zIndex: 25, backgroundColor: colors.gray800 },
  fixedTotalValue: { padding: `${spacing.xs} ${spacing.md}`, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray700, textAlign: 'center', backgroundColor: colors.primary, position: 'sticky', right: 0, width: COL_TOTAL_WIDTH, minWidth: COL_TOTAL_WIDTH, maxWidth: COL_TOTAL_WIDTH, zIndex: 25 },
  columnTotalCell: { padding: spacing.xs, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.gray700, textAlign: 'center', minWidth: COL_DATA_MIN_WIDTH },
  columnTotalValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  grandTotalValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  actions: { ...baseComponents.card, padding: spacing.lg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.gray50, borderWidth: '2px', borderStyle: 'solid', borderColor: colors.gray200 },
  summary: { flex: 1 },
  summaryCount: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.gray900, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  actionButtons: { display: 'flex', gap: spacing.md, alignItems: 'center', flexShrink: 0 },
  btnCancel: { height: '42px', padding: `0 ${spacing.md}`, minWidth: '120px', justifyContent: 'center', borderWidth: '1px', borderRadius: radius.md, fontSize: typography.sizes.sm },
  btnSave: { height: '42px', padding: `0 ${spacing.md}`, minWidth: '160px', justifyContent: 'center', borderRadius: radius.md, fontSize: typography.sizes.sm, backgroundColor: colors.success, color: '#fff', ':hover': { backgroundColor: colors.secondaryHover } },

  btnDisabled: { backgroundColor: '#E5E7EB', color: '#6B7280', border: `1px solid ${colors.gray300}`, cursor: 'not-allowed', boxShadow: 'none', opacity: 1, ':hover': { backgroundColor: '#E5E7EB', transform: 'none', boxShadow: 'none' } },
  fixedMachineDisplay: { display: 'flex', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, borderWidth: '2px', borderStyle: 'solid', borderColor: colors.primary, minHeight: '42px' },
  fixedMachineName: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.bold, flex: 1 },
  fixedMachineArea: { fontSize: typography.sizes.xs, color: colors.gray600, backgroundColor: colors.gray100, padding: `${spacing.xs} ${spacing.sm}`, borderRadius: radius.sm },
  unfixButton: { background: 'none', border: 'none', color: colors.error, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', padding: spacing.xs, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', ':hover': { backgroundColor: colors.error + '20' } },
  noFixedMachine: { fontSize: typography.sizes.sm, color: colors.gray500, fontStyle: 'italic', width: '100%', textAlign: 'center' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, textAlign: 'center', color: colors.gray500, minHeight: '100%', flex: 1 }
};

export default RegistroScrapCompleto;