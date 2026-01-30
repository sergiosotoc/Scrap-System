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
  }, [value, duration]);

  return <span>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

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
  indexDisplay,
  celdasSumadas
}) => {
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
              {celdasSumadas[`${realIndex}_material_${mat.id}`] && (
                <div style={styles.sumaIndicator} title={`Sumado ${celdasSumadas[`${realIndex}_material_${mat.id}`]} veces`}>
                  {celdasSumadas[`${realIndex}_material_${mat.id}`]}
                </div>
              )}
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
                  ...(editingValues?.[editKey] !== undefined ? styles.editingInput : {}),
                  ...(celdasSumadas[`${realIndex}_material_${mat.id}`] ? styles.summedCell : {})
                }}
                placeholder="-"
                readOnly={pesoBloqueado}
                autoComplete="off"
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

  const prevEditing = Object.keys(prevProps.editingValues || {})
    .filter(k => k.startsWith(`${prevProps.realIndex}_`))
    .map(k => prevProps.editingValues[k])
    .join('|');

  const nextEditing = Object.keys(nextProps.editingValues || {})
    .filter(k => k.startsWith(`${nextProps.realIndex}_`))
    .map(k => nextProps.editingValues[k])
    .join('|');

  const prevSumadas = Object.keys(prevProps.celdasSumadas || {})
    .filter(k => k.startsWith(`${prevProps.realIndex}_`))
    .map(k => prevProps.celdasSumadas[k])
    .join('|');
  const nextSumadas = Object.keys(nextProps.celdasSumadas || {})
    .filter(k => k.startsWith(`${nextProps.realIndex}_`))
    .map(k => nextProps.celdasSumadas[k])
    .join('|');

  return prevEditing === nextEditing && prevSumadas === nextSumadas;
});

const RegistroScrapCompleto = ({ onRegistroCreado, onCancelar, onLoadComplete }) => {
  const { addToast } = useToast();

  const [historialCeldas, setHistorialCeldas] = useState({});

  const [config, setConfig] = useState(null);
  const [materialesFlat, setMaterialesFlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tablaData, setTablaData] = useState([]);

  const [filtroArea, setFiltroArea] = useState('');
  const [filtroMaquina, setFiltroMaquina] = useState('');
  const [campoBasculaActivo, setCampoBasculaActivo] = useState('');

  const [pesoBloqueado, setPesoBloqueado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  const [areasDisponibles, setAreasDisponibles] = useState([]);
  const [maquinasDisponibles, setMaquinasDisponibles] = useState([]);

  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState({
    area: '',
    maquina: '',
    index: null
  });
  const [celdaActiva, setCeldaActiva] = useState(null);

  const [loadingFromStorage, setLoadingFromStorage] = useState(false);

  const [editingValues, setEditingValues] = useState({});
  const [celdasSumadas, setCeldasSumadas] = useState({});

  const [formData, setFormData] = useState({
    turno: storageService.getCurrentTurno(),
    fecha: storageService.getCurrentDate()
  });

  const maquinaSeleccionadaRef = useRef(maquinaSeleccionada);
  const celdaActivaRef = useRef(celdaActiva);
  const pesoBloqueadoRef = useRef(pesoBloqueado);
  const campoBasculaActivoRef = useRef(campoBasculaActivo);

  const pesoCongeladoRef = useRef(0);
  const liveWeightRef = useRef(0);

  const lockedTargetRef = useRef(null);
  const hasShownRecoveryToast = useRef(false);
  const isInitialMount = useRef(true);
  const editingTimeoutRef = useRef(null);
  const editingValuesRef = useRef({});
  const celdasSumadasRef = useRef({});

  const filtroAreaRef = useRef(filtroArea);
  const filtroMaquinaRef = useRef(filtroMaquina);
  const campoBasculaActivoRef2 = useRef(campoBasculaActivo);

  const onLoadCompleteRef = useRef(onLoadComplete);

  useEffect(() => { onLoadCompleteRef.current = onLoadComplete; }, [onLoadComplete]);
  useEffect(() => { maquinaSeleccionadaRef.current = maquinaSeleccionada; }, [maquinaSeleccionada]);
  useEffect(() => { celdaActivaRef.current = celdaActiva; }, [celdaActiva]);
  useEffect(() => { pesoBloqueadoRef.current = pesoBloqueado; }, [pesoBloqueado]);
  useEffect(() => { campoBasculaActivoRef.current = campoBasculaActivo; }, [campoBasculaActivo]);
  useEffect(() => { filtroAreaRef.current = filtroArea; }, [filtroArea]);
  useEffect(() => { filtroMaquinaRef.current = filtroMaquina; }, [filtroMaquina]);
  useEffect(() => { campoBasculaActivoRef2.current = campoBasculaActivo; }, [campoBasculaActivo]);
  useEffect(() => { celdasSumadasRef.current = celdasSumadas; }, [celdasSumadas]);

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

  useEffect(() => {
    editingValuesRef.current = editingValues;
  }, [editingValues]);


  const saveToStorageOnDemand = useCallback(() => {
    const currentTablaData = tablaData;
    const currentFormData = formData;
    const currentMaquinaSeleccionada = maquinaSeleccionadaRef.current;
    const currentCeldaActiva = celdaActivaRef.current;
    const currentCeldasSumadas = celdasSumadasRef.current;
    const currentFiltroArea = filtroAreaRef.current;
    const currentFiltroMaquina = filtroMaquinaRef.current;
    const currentCampoBasculaActivo = campoBasculaActivoRef2.current;

    if (tablaData.length === 0) return;
    const filasConDatos = tablaData.filter(fila => fila.peso_total > 0);

    if (filasConDatos.length > 0) {
      const dataToSave = {
        tablaData,
        formData,
        filtroArea: filtroAreaRef.current,
        filtroMaquina: filtroMaquinaRef.current,
        campoBasculaActivo: campoBasculaActivoRef2.current,
        maquinaSeleccionada,
        celdaActiva: celdaActivaRef.current,
        celdasSumadas
      };
      const success = storageService.saveDraft(dataToSave, true);
      if (success) {
        addToast('Datos guardados en borrador correctamente', 'success');
      }
    }
  }, [tablaData, formData, maquinaSeleccionada, celdasSumadas, addToast]);

  const autoSaveToStorage = useCallback(() => {
    if (tablaData.length === 0) return;

    const dataToSave = {
      tablaData,
      formData,
      filtroArea: filtroAreaRef.current,
      filtroMaquina: filtroMaquinaRef.current,
      campoBasculaActivo: campoBasculaActivoRef2.current,
      maquinaSeleccionada,
      celdaActiva: celdaActivaRef.current,
      celdasSumadas,
      pesoBloqueado
    };
    storageService.saveDraft(dataToSave, false);
  }, [tablaData, formData, maquinaSeleccionada, celdasSumadas, pesoBloqueado]);

  useEffect(() => {
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
        }

        let initialMaterial = '';
        if (flatMats.length > 0) {
          initialMaterial = `material_${flatMats[0].id}`;
          if (!campoBasculaActivoRef2.current) {
            setCampoBasculaActivo(initialMaterial);
            campoBasculaActivoRef2.current = initialMaterial;
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

          const savedData = storageService.loadDraftData();

          if (savedData && savedData.tablaData) {
            setLoadingFromStorage(true);

            if (savedData.formData) setFormData(savedData.formData);
            if (savedData.celdasSumadas) setCeldasSumadas(savedData.celdasSumadas);

            if (savedData.pesoBloqueado !== undefined) {
              setPesoBloqueado(savedData.pesoBloqueado);
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
            if (savedData.maquinaSeleccionada) setMaquinaSeleccionada(savedData.maquinaSeleccionada);
            if (savedData.celdaActiva) setCeldaActiva(savedData.celdaActiva);

            const mergedData = data.map((row) => {
              const savedRow = savedData.tablaData.find(
                s => s.area_real === row.area_real && s.maquina_real === row.maquina_real
              );
              if (savedRow) {
                return {
                  ...row,
                  ...savedRow,
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
            if (!hasShownRecoveryToast.current) {
              setTimeout(() => {
                addToast('Datos recuperados de la sesión anterior', 'info');
                hasShownRecoveryToast.current = true;
              }, 500);
            }
            setLoadingFromStorage(false);
          } else {
            setTablaData(data);
          }

          setAreasDisponibles(areas);
        }
      } catch (error) {
        if (mounted) addToast('Error cargando configuración: ' + error.message, 'error');
      } finally {
        if (mounted) {
          setLoading(false);
          if (onLoadCompleteRef.current) onLoadCompleteRef.current();
          setTimeout(() => setTriggerAnimation(true), 150);
          isInitialMount.current = false;
        }
      }
    };

    initData();
    return () => { mounted = false; };
  }, [addToast]);

  useEffect(() => {
    if (!config?.areas_maquinas) {
      setMaquinasDisponibles([]);
      return;
    }
    const maquinas = config.areas_maquinas[filtroArea]?.map(m => m.maquina_nombre) || [];
    setMaquinasDisponibles(maquinas);

    if (maquinas.length === 1 && !filtroMaquina) {
      const maquinaUnica = maquinas[0];
      setFiltroMaquina(maquinaUnica);
      filtroMaquinaRef.current = maquinaUnica;
      const index = tablaData.findIndex(r => r.area_real === filtroArea && r.maquina_real === maquinaUnica);
      if (index !== -1) {
        setMaquinaSeleccionada({ area: filtroArea, maquina: maquinaUnica, index });
        setCeldaActiva({ areaIndex: index, campo: campoBasculaActivoRef2.current });
      }
    } else if (filtroArea && !filtroMaquina && maquinaSeleccionada.area === filtroArea) {
      setFiltroMaquina(maquinaSeleccionada.maquina);
      filtroMaquinaRef.current = maquinaSeleccionada.maquina;
    }
  }, [filtroArea, config, filtroMaquina, maquinaSeleccionada, tablaData]);

  const handleLimpiarSumas = useCallback(() => {
    if (Object.keys(celdasSumadas).length === 0) {
      addToast('No hay registros de suma para limpiar', 'info');
      return;
    }
    if (window.confirm('¿Está seguro de que desea limpiar todos los registros de suma? Esto reiniciará los contadores de suma.')) {
      setCeldasSumadas({});
      addToast('Registros de suma limpiados correctamente', 'success');
      const dataToSave = {
        tablaData,
        formData,
        filtroArea: filtroAreaRef.current,
        filtroMaquina: filtroMaquinaRef.current,
        campoBasculaActivo: campoBasculaActivoRef2.current,
        maquinaSeleccionada,
        celdaActiva: celdaActivaRef.current,
        celdasSumadas: {}
      };
      storageService.saveDraft(dataToSave, false);
    }
  }, [celdasSumadas, addToast, tablaData, formData, maquinaSeleccionada]);

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
    } else {
      if (celdaActiva !== null || maquinaSeleccionada.index !== null) {
        setMaquinaSeleccionada({ area: '', maquina: '', index: null });
        setCeldaActiva(null);
        setPesoBloqueado(false);
      }
    }
  }, [filtroArea, filtroMaquina, campoBasculaActivo, tablaData, maquinaSeleccionada.index, celdaActiva?.campo]);

  const handleCellFocus = useCallback((areaIndex, campo, area, maquina) => {
    setPesoBloqueado(false);
    pesoBloqueadoRef.current = false;

    setCeldaActiva({ areaIndex, campo });
    setCampoBasculaActivo(campo);
    setMaquinaSeleccionada({ area, maquina, index: areaIndex });

    setFiltroArea(area);
    filtroAreaRef.current = area;
    setFiltroMaquina(maquina);
    filtroMaquinaRef.current = maquina;

    celdaActivaRef.current = { areaIndex, campo };
    campoBasculaActivoRef.current = campo;
    maquinaSeleccionadaRef.current = { area, maquina, index: areaIndex };
  }, []);

  const handleKeyPress = useCallback((e, areaIndex, campo) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      e.target.blur();

      setPesoBloqueado(true);

      addToast('Valor fijado y peso congelado', 'info');
    }
  }, [addToast]);

  const handleInputChangeTabla = useCallback((areaIndex, campo, valor) => {
    const key = `${areaIndex}_${campo}`;
    const regex = /^-?\d*\.?\d*$/;
    if (valor === '' || regex.test(valor)) {
      setEditingValues(prev => ({ ...prev, [key]: valor }));
    }
  }, []);

  const handleInputBlur = useCallback((areaIndex, campo) => {
    const key = `${areaIndex}_${campo}`;
    const rawValue = editingValues[key];

    if (rawValue === undefined) return;

    const val = rawValue === '' ? 0 : round3(parseFloat(rawValue) || 0);
    const valorPrevio = parseFloat(tablaData[areaIndex][campo]) || 0;

    // Si el valor cambió manualmente, guardamos el rastro y el valor que tenía antes
    if (Math.abs(valorPrevio - val) > 0.001) {
      setHistorialCeldas(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          valorAnterior: valorPrevio,
          modificadoManual: true,
          fuente: 'Teclado' // Marcamos explícitamente como entrada de teclado
        }
      }));
    }

    setTablaData(prev => {
      const newData = [...prev];
      const filaActualizada = { ...newData[areaIndex] };
      filaActualizada[campo] = val;

      let total = 0;
      materialesFlat.forEach(m => {
        const matKey = `material_${m.id}`;
        total += parseFloat(filaActualizada[matKey]) || 0;
      });

      filaActualizada.peso_total = round3(total);
      // Marcamos la fila como manual si la última acción fue una edición directa
      filaActualizada.conexion_bascula = false;
      newData[areaIndex] = filaActualizada;
      return newData;
    });

    setEditingValues(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, [editingValues, tablaData, materialesFlat]);

  const handlePesoFromBascula = useCallback((pesoInput, campoDestinoEnviado, esAutomatico) => {
    const currentBloqueado = pesoBloqueadoRef.current;
    const campoRealActivo = campoBasculaActivoRef.current;
    const currentMaquinaSel = maquinaSeleccionadaRef.current;
    const currentCelda = celdaActivaRef.current;

    let nuevoValorRaw = 0;
    if (pesoInput !== undefined && pesoInput !== null) {
      nuevoValorRaw = parseFloat(pesoInput) || 0;
    }

    liveWeightRef.current = nuevoValorRaw;

    if (campoDestinoEnviado && campoDestinoEnviado !== campoRealActivo) return;
    if (!campoRealActivo) return;

    if (currentBloqueado) return;

    let targetIndex = -1;
    if (currentMaquinaSel.index !== null) {
      targetIndex = currentMaquinaSel.index;
    } else if (currentCelda && currentCelda.areaIndex !== undefined) {
      targetIndex = currentCelda.areaIndex;
    }

    if (targetIndex !== -1) {
      pesoCongeladoRef.current = nuevoValorRaw;
      const celdaKey = `${targetIndex}_${campoRealActivo}`;

      setHistorialCeldas(prev => ({
        ...prev,
        [celdaKey]: {
          ...prev[celdaKey],
          fuente: esAutomatico ? 'Báscula-Auto' : 'Báscula-Manual-Input'
        }
      }));

      if (editingValuesRef.current[celdaKey] !== undefined || celdasSumadasRef.current[celdaKey]) {
        return;
      }

      setTablaData(prevData => {
        const filaActual = prevData[targetIndex];
        if (!filaActual) return prevData;

        const valorAnterior = filaActual[campoRealActivo];

        if (Math.abs(valorAnterior - nuevoValorRaw) > 0.001) {
          const newData = [...prevData];
          const filaActualizada = { ...filaActual };
          filaActualizada[campoRealActivo] = round3(nuevoValorRaw);
          filaActualizada.conexion_bascula = esAutomatico;

          let total = 0;
          materialesFlat.forEach(m => {
            total += parseFloat(filaActualizada[`material_${m.id}`]) || 0;
          });
          filaActualizada.peso_total = round3(total);
          newData[targetIndex] = filaActualizada;
          return newData;
        }
        return prevData;
      });
    }
  }, [materialesFlat]);

  const handleTogglePesoBloqueado = () => {
    const newPesoBloqueado = !pesoBloqueado;
    setPesoBloqueado(newPesoBloqueado);
    pesoBloqueadoRef.current = newPesoBloqueado;

    if (newPesoBloqueado) {
      const dataToSave = {
        tablaData,
        formData,
        filtroArea: filtroAreaRef.current,
        filtroMaquina: filtroMaquinaRef.current,
        campoBasculaActivo: campoBasculaActivoRef2.current,
        maquinaSeleccionada,
        celdaActiva: celdaActivaRef.current,
        celdasSumadas,
        pesoBloqueado: true
      };
      storageService.saveDraft(dataToSave, true);
      addToast('Peso capturado y guardado', 'success');
    } else {
      const pesoActual = liveWeightRef.current;
      const target = celdaActivaRef.current;

      if (target && pesoActual > 0) {
        setTablaData(prev => {
          const newData = [...prev];
          const fila = { ...newData[target.areaIndex] };
          fila[target.campo] = round3(pesoActual);

          let total = 0;
          materialesFlat.forEach(m => total += parseFloat(fila[`material_${m.id}`]) || 0);
          fila.peso_total = round3(total);

          newData[target.areaIndex] = fila;
          return newData;
        });
      }
    }
  };

  const handleSumarPeso = useCallback(() => {
    if (!pesoBloqueadoRef.current) {
      addToast('Primero debe CONGELAR EL PESO antes de sumar', 'warning');
      return;
    }

    if (!celdaActivaRef.current) {
      addToast('Seleccione una celda para sumar el peso', 'warning');
      return;
    }

    const pesoASumar = parseFloat(liveWeightRef.current) || 0;
    if (pesoASumar <= 0) {
      addToast('La báscula está en cero o el valor es inválido', 'warning');
      return;
    }

    const { areaIndex, campo } = celdaActivaRef.current;
    const celdaKey = `${areaIndex}_${campo}`;

    setTablaData(prevData => {
      const newData = [...prevData];
      const filaActual = { ...newData[areaIndex] };
      const valorActual = parseFloat(filaActual[campo]) || 0;

      filaActual[campo] = round3(valorActual + pesoASumar);
      filaActual.conexion_bascula = true;

      let totalFila = 0;
      materialesFlat.forEach(m => {
        totalFila += parseFloat(filaActual[`material_${m.id}`]) || 0;
      });
      filaActual.peso_total = round3(totalFila);
      newData[areaIndex] = filaActual;

      const dataToSave = {
        tablaData: newData,
        formData,
        filtroArea: filtroAreaRef.current,
        filtroMaquina: filtroMaquinaRef.current,
        campoBasculaActivo: campoBasculaActivoRef2.current,
        maquinaSeleccionada: maquinaSeleccionadaRef.current,
        celdaActiva: celdaActivaRef.current,
        celdasSumadas: {
          ...celdasSumadasRef.current,
          [celdaKey]: (celdasSumadasRef.current[celdaKey] || 0) + 1
        },
        pesoBloqueado: true
      };
      storageService.saveDraft(dataToSave, false);

      return newData;
    });

    setCeldasSumadas(prev => ({
      ...prev,
      [celdaKey]: (prev[celdaKey] || 0) + 1
    }));

    addToast(`+ ${pesoASumar.toFixed(3)} kg sumados correctamente`, 'success');
  }, [materialesFlat, formData, addToast]);

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

  const handleAreaChange = (e) => {
    const nuevaArea = e.target.value;
    setFiltroArea(nuevaArea);
    filtroAreaRef.current = nuevaArea;
    setFiltroMaquina('');
    filtroMaquinaRef.current = '';
    setMaquinaSeleccionada({ area: '', maquina: '', index: null });
    setCeldaActiva(null);
  };

  const handleMaquinaChange = (e) => {
    const nuevaMaquina = e.target.value;
    setFiltroMaquina(nuevaMaquina);
    filtroMaquinaRef.current = nuevaMaquina;
  };

  const handleFechaChange = (e) => {
    const newFecha = e.target.value;
    setFormData(prev => ({ ...prev, fecha: newFecha }));
    if (newFecha !== storageService.getCurrentDate()) {
      storageService.clearDraftData();
    }
  };

  const handleTurnoChange = (e) => {
    const newTurno = e.target.value;
    setFormData(prev => ({ ...prev, turno: newTurno }));
    if (newTurno !== storageService.getCurrentTurno()) {
      storageService.clearDraftData();
    }
  };

  const construirObservacionesFila = (fila, realIndex) => {
    let notas = [];
    materialesFlat.forEach(mat => {
      const key = `material_${mat.id}`;
      const celdaKey = `${realIndex}_${key}`;
      const historial = historialCeldas[celdaKey];
      const vecesSumado = celdasSumadas[celdaKey];
      const valorActual = parseFloat(fila[key]) || 0;

      // Solo reportamos si hay historial o sumas en materiales con peso > 0
      if ((historial && valorActual > 0) || vecesSumado) {
        let detalle = `[${mat.tipo_nombre}]: `;

        if (historial?.modificadoManual) {
          detalle += `Editado manualmente (Previo: ${historial.valorAnterior}kg). `;
        }

        if (historial?.fuente) {
          detalle += `Origen: ${historial.fuente}. `;
        }

        if (vecesSumado) {
          detalle += `Peso acumulado (Sumado ${vecesSumado} veces). `;
        }

        notas.push(detalle.trim());
      }
    });

    return notas.length > 0 ? notas.join(' | ') : 'Registro estándar sin modificaciones';
  };

  // 4. Función handleSubmit optimizada para determinar la fuente real de los datos
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
      const prepararDatosFila = (fila) => {
        const realIndex = tablaData.findIndex(item =>
          item.area_real === fila.area_real && item.maquina_real === fila.maquina_real
        );

        const detalles = [];
        let algunMaterialFueBascula = false;

        materialesFlat.forEach(mat => {
          const key = `material_${mat.id}`;
          const celdaKey = `${realIndex}_${key}`;
          const peso = fila[key];

          if (peso > 0) {
            detalles.push({ id: mat.id, peso: peso });

            // LÓGICA DE VALIDACIÓN DE ORIGEN:
            // Verificamos si este material específico vino de la báscula automática
            // o si se usó la función de "Sumar" (que también requiere báscula conectada).
            const h = historialCeldas[celdaKey];
            const s = celdasSumadas[celdaKey];

            if (h?.fuente === 'Báscula-Auto' || s > 0 || fila.conexion_bascula) {
              algunMaterialFueBascula = true;
            }
          }
        });

        return {
          turno: formData.turno,
          area_real: fila.area_real,
          maquina_real: fila.maquina_real,
          // Priorizamos marcar como conectado si detectamos rastro de báscula en el historial
          conexion_bascula: algunMaterialFueBascula,
          numero_lote: `LOTE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          observaciones: construirObservacionesFila(fila, realIndex),
          detalles: detalles
        };
      };

      if (filasConPeso.length > 10) {
        const datosBatch = filasConPeso.map(fila => prepararDatosFila(fila));
        const resultado = await apiClient.createRegistroScrapBatch(datosBatch);

        if (resultado.success) {
          storageService.clearDraftData();
          addToast(`Guardado exitoso: ${resultado.count_exitosos} máquinas registradas`, 'success');
          if (onRegistroCreado) onRegistroCreado();
        } else {
          throw new Error(resultado.message || 'Error al procesar el lote');
        }
      } else {
        const promises = filasConPeso.map(fila =>
          apiClient.createRegistroScrap(prepararDatosFila(fila))
        );

        await Promise.all(promises);
        storageService.clearDraftData();
        addToast(`Se guardaron exitosamente ${filasConPeso.length} registros`, 'success');
        if (onRegistroCreado) onRegistroCreado();
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      addToast(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelar = () => {
    const tieneDatos = tablaData.some(fila => fila.peso_total > 0);
    if (tieneDatos) {
      if (window.confirm('¿Desea guardar los datos para continuar después?')) {
        setTimeout(() => {
          const dataToSave = {
            tablaData,
            formData,
            filtroArea: filtroAreaRef.current,
            filtroMaquina: filtroMaquinaRef.current,
            campoBasculaActivo: campoBasculaActivoRef2.current,
            maquinaSeleccionada: maquinaSeleccionadaRef.current,
            celdaActiva: celdaActivaRef.current,
            celdasSumadas: celdasSumadasRef.current
          };
          storageService.saveDraft(dataToSave, true);
          addToast('Datos guardados para continuar después', 'success');
          onCancelar();
        }, 100);
      } else {
        storageService.clearDraftData();
        onCancelar();
      }
    } else {
      storageService.clearDraftData();
      onCancelar();
    }
  };

  const handleClearStorage = () => {
    if (window.confirm('¿Está seguro de que desea eliminar todos los datos guardados temporalmente?')) {
      storageService.clearDraftData();
      setTablaData(prev => prev.map(fila => ({
        ...fila,
        peso_total: 0,
        ...materialesFlat.reduce((acc, m) => {
          acc[`material_${m.id}`] = 0;
          return acc;
        }, {})
      })));
      setCeldasSumadas({});
      addToast('Datos temporales eliminados', 'info');
    }
  };

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

    datosFiltrados.forEach((fila) => {
      const realIndex = tablaData.findIndex(item =>
        item.area_real === fila.area_real && item.maquina_real === fila.maquina_real
      );

      materialesFlat.forEach(m => {
        const key = `material_${m.id}`;
        const editKey = `${realIndex}_${key}`;

        const valor = editingValues[editKey] !== undefined
          ? (editingValues[editKey] === '' ? 0 : parseFloat(editingValues[editKey]) || 0)
          : (parseFloat(fila[key]) || 0);

        acc[key] = (acc[key] || 0) + Math.round(valor * 1000);
      });

      let filaTotal = 0;
      materialesFlat.forEach(m => {
        const key = `material_${m.id}`;
        const editKey = `${realIndex}_${key}`;

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
  }, [datosFiltrados, tablaData, materialesFlat, editingValues]);

  if (loading) {
    return <div style={styles.loading}><LoadingSpinner message="Cargando configuración..." /></div>;
  }

  const numFilasConPeso = datosFiltrados.filter(fila => fila.peso_total > 0).length;
  const hasSavedData = storageService.hasValidDraft();
  const isSaveDisabled = enviando || !formData.turno || numFilasConPeso === 0;

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
                <label style={styles.label}>Controles y Monitor</label>
                <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <SmoothButton
                    type="button"
                    onClick={handleTogglePesoBloqueado}
                    style={{
                      ...(pesoBloqueado ? styles.btnLocked : styles.btnUnlocked),
                      flex: 1, height: '42px', minWidth: '100px', fontSize: '0.7rem', padding: '0 4px'
                    }}
                    variant={pesoBloqueado ? 'destructive' : 'primary'}
                    title="Congelar el peso actual para lectura manual"
                  >
                    {pesoBloqueado ? 'LEER PESO (Descongelar)' : 'CONGELAR PESO'}
                  </SmoothButton>

                  <SmoothButton
                    type="button"
                    onClick={handleSumarPeso}
                    variant="success"
                    disabled={!pesoBloqueado}
                    style={{
                      flex: 1,
                      height: '42px',
                      minWidth: '100px',
                      fontSize: '0.7rem',
                      padding: '0 4px',
                      ...(pesoBloqueado ? { backgroundColor: colors.success } : styles.btnSumarDisabled)
                    }}
                    title={pesoBloqueado ? "Agrega el peso actual al acumulado" : "Debe congelar el peso para habilitar la suma"}
                  >
                    SUMAR PESO
                  </SmoothButton>

                  <div style={{
                    ...styles.fixedMachineDisplay,
                    flex: 1.5,
                    minWidth: '200px',
                    height: '42px',
                    margin: 0,
                    padding: '0 8px'
                  }}>
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
              </div>
            </div>

            {/* Eliminado el contenedor original de Máquina Fijada que estaba aquí abajo */}
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
                      celdasSumadas={celdasSumadas}
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

  summedCell: {
    borderColor: colors.success,
    borderWidth: '2px',
    backgroundColor: colors.success + '10',
    fontWeight: typography.weights.bold
  },

  // Indicador de suma
  sumaIndicator: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    backgroundColor: colors.success,
    color: '#fff',
    fontSize: '9px',
    fontWeight: 'bold',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },

  // Estilo para el botón de sumar
  btnSumar: {
    backgroundColor: colors.success,
    color: '#fff',
    ':hover': {
      backgroundColor: colors.successHover || '#059669'
    }
  },

  btnSumarDisabled: {
    backgroundColor: colors.gray300,
    color: colors.gray600,
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: colors.gray300
    }
  },

  btnSumarDisabled: {
    backgroundColor: colors.gray300,
    color: colors.gray500,
    cursor: 'not-allowed',
    opacity: 0.7,
    transform: 'none',
    boxShadow: 'none'
  },

  btnDisabled: { backgroundColor: '#E5E7EB', color: '#6B7280', border: `1px solid ${colors.gray300}`, cursor: 'not-allowed', boxShadow: 'none', opacity: 1, ':hover': { backgroundColor: '#E5E7EB', transform: 'none', boxShadow: 'none' } },
  fixedMachineDisplay: { display: 'flex', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, borderWidth: '2px', borderStyle: 'solid', borderColor: colors.primary, minHeight: '42px' },
  fixedMachineName: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.bold, flex: 1 },
  fixedMachineArea: { fontSize: typography.sizes.xs, color: colors.gray600, backgroundColor: colors.gray100, padding: `${spacing.xs} ${spacing.sm}`, borderRadius: radius.sm },
  unfixButton: { background: 'none', border: 'none', color: colors.error, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', padding: spacing.xs, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', ':hover': { backgroundColor: colors.error + '20' } },
  noFixedMachine: { fontSize: typography.sizes.sm, color: colors.gray500, fontStyle: 'italic', width: '100%', textAlign: 'center' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, textAlign: 'center', color: colors.gray500, minHeight: '100%', flex: 1 },
};

export default RegistroScrapCompleto;