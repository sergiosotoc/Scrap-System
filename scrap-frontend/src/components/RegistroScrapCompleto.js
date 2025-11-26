/* src/components/RegistroScrapCompleto.js */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';
import { useToast } from '../context/ToastContext';
import { usePreguardado } from '../hooks/usePreguardado';

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

  // Hook de preguardado
  const { preguardado, cargando: cargandoPreguardado, guardarPreguardado, limpiarPreguardado } =
    usePreguardado(filtroArea, filtroMaquina);

  // Cargar configuración
  const loadConfig = useCallback(async () => {
    try {
      const configData = await apiClient.getRegistrosConfig();
      setConfig(configData);
      // ✅ CORREGIDO: Mover inicializarTablaData dentro del callback
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
      addToast('Error cargando configuración: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const inicializarTablaData = useCallback((configData) => {
    if (!configData?.areas_maquinas) return;

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
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Cargar preguardado cuando esté disponible
  useEffect(() => {
    if (preguardado && !cargandoPreguardado) {
      // Aplicar preguardado a la tabla
      setTablaData(prev => prev.map(fila => {
        if (fila.area_real === preguardado.area_real && fila.maquina_real === preguardado.maquina_real) {
          return {
            ...fila,
            ...preguardado.pesos,
            peso_total: calcularTotalFila({ ...fila, ...preguardado.pesos })
          };
        }
        return fila;
      }));

      // Actualizar turno
      setFormData(prev => ({ ...prev, turno: preguardado.turno }));

      addToast('Pesos preguardados cargados correctamente', 'success');
    }
  }, [preguardado, cargandoPreguardado, addToast]);

  // Filtrar maquinas cuando cambia el área
  useEffect(() => {
    if (!config?.areas_maquinas || !filtroArea) {
      setMaquinasDisponibles([]);
      return;
    }

    const maquinas = config.areas_maquinas[filtroArea]?.map(m => m.maquina_nombre) || [];
    setMaquinasDisponibles(maquinas);

    // Si hay solo una máquina, seleccionarla automáticamente
    if (maquinas.length === 1) {
      setFiltroMaquina(maquinas[0]);
    } else {
      setFiltroMaquina('');
    }
  }, [filtroArea, config]);

  // Efecto para activar automáticamente la máquina cuando se selecciona
  useEffect(() => {
    if (filtroArea && filtroMaquina && campoBasculaActivo) {
      seleccionarAreaMaquina(filtroArea, filtroMaquina);
    }
  }, [filtroArea, filtroMaquina, campoBasculaActivo]);

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

          console.log('✅ Peso asignado a celda específica:', {
            maquina: newData[areaIndex].maquina_real,
            campo,
            peso: nuevoValor
          });
        }

        return newData;
      });

      if (peso > 0) {
        addToast(`✅ Peso ${peso}kg asignado a ${campo} en ${tablaData[celdaActiva.areaIndex]?.maquina_real}`, 'success');
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

          console.log('✅ Peso asignado por filtro:', {
            maquina: newData[index].maquina_real,
            campo,
            peso: nuevoValor
          });

          return newData;
        });

        // Activar automáticamente la celda
        setCeldaActiva({ areaIndex: index, campo });

        if (peso > 0) {
          addToast(`✅ Peso ${peso}kg asignado a ${campo} en ${filtroMaquina}`, 'success');
        }
      }
    }
    else {
      console.warn('⚠️ No hay celda activa ni filtros seleccionados');
      addToast('⚠️ Selecciona un área y máquina primero', 'warning');
    }

    ultimoPesoRef.current = peso;
  }, [pesoBloqueado, celdaActiva, campoBasculaActivo, addToast, tablaData, filtroArea, filtroMaquina]);

  // Función para seleccionar automáticamente cuando cambian los filtros
  useEffect(() => {
    if (filtroArea && filtroMaquina && campoBasculaActivo) {
      const index = tablaData.findIndex(fila =>
        fila.area_real === filtroArea && fila.maquina_real === filtroMaquina
      );

      if (index !== -1) {
        setCeldaActiva({ areaIndex: index, campo: campoBasculaActivo });
        console.log('🎯 Celda activada automáticamente:', {
          area: filtroArea,
          maquina: filtroMaquina,
          campo: campoBasculaActivo,
          index
        });
      }
    }
  }, [filtroArea, filtroMaquina, campoBasculaActivo, tablaData]);

  // Calcular total por fila
  const calcularTotalFila = (fila) => {
    const camposPeso = [
      'peso_cobre',
      'peso_cobre_estanado',
      'peso_purga_pvc',
      'peso_purga_pe',
      'peso_purga_pur',
      'peso_purga_pp',
      'peso_cable_pvc',
      'peso_cable_pe',
      'peso_cable_pur',
      'peso_cable_pp',
      'peso_cable_aluminio',
      'peso_cable_estanado_pvc',
      'peso_cable_estanado_pe'
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

  // Función para seleccionar área/máquina rápidamente
  const seleccionarAreaMaquina = (area, maquina) => {
    if (!area || !maquina) return;

    // Encontrar el índice de la fila que coincide con área y máquina
    const index = tablaData.findIndex(fila =>
      fila.area_real === area && fila.maquina_real === maquina
    );

    if (index !== -1 && campoBasculaActivo) {
      setCeldaActiva({ areaIndex: index, campo: campoBasculaActivo });
      addToast(`✅ ${maquina} seleccionada - Listo para báscula en ${campoBasculaActivo}`, 'success');
    }
  };

  // Preguardar pesos
  const handlePreguardar = async () => {
    if (!filtroArea || !filtroMaquina || !formData.turno) {
      addToast('Seleccione área, máquina y turno para preguardar', 'warning');
      return;
    }

    const fila = tablaData.find(fila =>
      fila.area_real === filtroArea && fila.maquina_real === filtroMaquina
    );

    if (!fila) {
      addToast('No se encontró la fila para preguardar', 'error');
      return;
    }

    // ✅ CORREGIDO: Bloquear el peso antes de preguardar
    setPesoBloqueado(true);

    const pesos = {
      peso_cobre: fila.peso_cobre || 0,
      peso_cobre_estanado: fila.peso_cobre_estanado || 0,
      peso_purga_pvc: fila.peso_purga_pvc || 0,
      peso_purga_pe: fila.peso_purga_pe || 0,
      peso_purga_pur: fila.peso_purga_pur || 0,
      peso_purga_pp: fila.peso_purga_pp || 0,
      peso_cable_pvc: fila.peso_cable_pvc || 0,
      peso_cable_pe: fila.peso_cable_pe || 0,
      peso_cable_pur: fila.peso_cable_pur || 0,
      peso_cable_pp: fila.peso_cable_pp || 0,
      peso_cable_aluminio: fila.peso_cable_aluminio || 0,
      peso_cable_estanado_pvc: fila.peso_cable_estanado_pvc || 0,
      peso_cable_estanado_pe: fila.peso_cable_estanado_pe || 0,
    };

    try {
      const success = await guardarPreguardado(formData.turno, pesos);
      if (success) {
        addToast('Pesos preguardados correctamente. El peso está bloqueado.', 'success');
      } else {
        addToast('Error al preguardar los pesos', 'error');
        setPesoBloqueado(false); // Desbloquear si hay error
      }
    } catch (error) {
      console.error('❌ Error en handlePreguardar:', error);
      addToast('Error al preguardar: ' + error.message, 'error');
      setPesoBloqueado(false); // Desbloquear si hay error
    }
  };
  const handleDesbloquearPeso = () => {
    setPesoBloqueado(false);
    addToast('✅ Peso desbloqueado - La báscula actualizará de nuevo', 'info');
  };
  // Limpiar preguardado
  const handleLimpiarPreguardado = async () => {
    const success = await limpiarPreguardado();
    if (success) {
      addToast('Preguardado limpiado correctamente', 'info');
    }
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
        // Preparar datos específicos para el backend
        const datosEnvio = {
          turno: formData.turno,
          area_real: fila.area_real,
          maquina_real: fila.maquina_real,
          conexion_bascula: fila.conexion_bascula || false,
          numero_lote: `LOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          observaciones: 'Registro múltiple desde tabla',
          // Incluir el material seleccionado si está disponible
          material_seleccionado: campoBasculaActivo,
          peso_actual: fila[campoBasculaActivo] || 0,
          // Incluir todos los pesos
          ...fila
        };

        console.log('📤 Enviando registro:', datosEnvio);
        return apiClient.createRegistroScrap(datosEnvio);
      });

      const resultados = await Promise.all(promises);

      // Limpiar preguardado después de guardar exitosamente
      if (filtroArea && filtroMaquina) {
        await limpiarPreguardado();
      }

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

  if (loading) return <div style={styles.loading}>Cargando configuración...</div>;

  const totales = calcularTotalesColumnas();
  const tiposScrap = config?.tipos_scrap ? Object.values(config.tipos_scrap).flat() : [];
  const filasConPeso = tablaData.filter(fila => fila.peso_total > 0).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Registro Completo de Scrap</h1>
        <p style={styles.subtitle}>Complete los datos de producción para todas las máquinas</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.formPrincipal}>

        {/* PANEL SUPERIOR: CONTROLES PRINCIPALES */}
        <div style={styles.controlsPanel}>
          {/* Sección de Báscula */}
          <div style={styles.basculaSection}>
            <h3 style={styles.sectionTitle}>⚖️ Control de Báscula</h3>
            <BasculaConnection
              onPesoObtenido={handlePesoFromBascula}
              campoDestino={campoBasculaActivo}
            />
          </div>

          {/* Sección de Configuración */}
          <div style={styles.configSection}>
            <h3 style={styles.sectionTitle}>📋 Datos de la Jornada</h3>
            <div style={styles.configGrid}>
              <div style={styles.configGroup}>
                <label style={styles.label}>Fecha:</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={styles.configGroup}>
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

              <div style={styles.configGroup}>
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

              {/* FILTROS INTEGRADOS */}
              <div style={styles.configGroup}>
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

              <div style={styles.configGroup}>
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

              {/* BOTONES DE PREGUARDADO */}
              <div style={styles.preguardadoSection}>
                <div style={styles.preguardadoButtons}>
                  <button
                    type="button"
                    onClick={handlePreguardar}
                    style={styles.btnPreguardar}
                    disabled={!filtroArea || !filtroMaquina || !formData.turno}
                  >
                    💾 Preguardar Pesos
                  </button>

                  {pesoBloqueado && (
                    <button
                      type="button"
                      onClick={handleDesbloquearPeso}
                      style={styles.btnDesbloquear}
                    >
                      🔓 Desbloquear Peso
                    </button>
                  )}

                  {preguardado && (
                    <button
                      type="button"
                      onClick={handleLimpiarPreguardado}
                      style={styles.btnLimpiarPreguardado}
                    >
                      🗑️ Limpiar
                    </button>
                  )}
                </div>

                {pesoBloqueado && (
                  <div style={styles.bloqueoInfo}>
                    <span style={styles.bloqueoText}>⏸️ Peso bloqueado - Use "Desbloquear Peso" para continuar</span>
                  </div>
                )}

                {preguardado && (
                  <div style={styles.preguardadoInfo}>
                    <span style={styles.preguardadoText}>
                      📝 Preguardado disponible ({new Date(preguardado.timestamp).toLocaleTimeString()})
                    </span>
                  </div>
                )}
              </div>

              {/* INDICADOR DE MÁQUINA ACTIVA */}
              {celdaActiva && (
                <div style={styles.activeMachineIndicator}>
                  <div style={styles.indicatorHeader}>
                    <span style={styles.indicatorIcon}>🎯</span>
                    <strong style={styles.indicatorTitle}>Máquina Activa</strong>
                  </div>
                  <div style={styles.indicatorDetails}>
                    <span style={styles.indicatorText}>
                      {tablaData[celdaActiva.areaIndex]?.maquina_real}
                    </span>
                    <span style={styles.indicatorSubtext}>
                      {campoBasculaActivo}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DE DATOS */}
        <div style={styles.dataPanel}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>📊 Datos de Producción</h3>
            <div style={styles.tableStats}>
              <span style={styles.statItem}>
                Máquinas: <strong>{datosFiltrados.length}</strong>
              </span>
              <span style={styles.statItem}>
                Con datos: <strong>{filasConPeso}</strong>
              </span>
              <span style={styles.statItem}>
                Total: <strong>{totales.general.toFixed(3)} kg</strong>
              </span>
            </div>
          </div>

          <div style={styles.tablaContainer}>
            <div style={styles.tablaWrapper}>
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={styles.th}>ÁREA</th>
                    <th style={styles.th}>MÁQUINA</th>
                    {tiposScrap.map(tipo => (
                      <th key={tipo.columna_db} style={styles.th}>
                        {tipo.tipo_nombre}
                      </th>
                    ))}
                    <th style={styles.th}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {datosFiltrados.map((fila, index) => {
                    const realIndex = tablaData.findIndex(item =>
                      item.area_real === fila.area_real && item.maquina_real === fila.maquina_real
                    );

                    const estaActiva = celdaActiva?.areaIndex === realIndex;
                    const esMaquinaFiltrada = filtroMaquina && fila.maquina_real === filtroMaquina;

                    return (
                      <tr
                        key={`${fila.area_real}-${fila.maquina_real}`}
                        style={{
                          ...styles.tr,
                          ...(estaActiva ? styles.filaActiva : {}),
                          ...(esMaquinaFiltrada && !estaActiva ? styles.filaSeleccionada : {})
                        }}
                      >
                        <td style={styles.td}>{fila.area_real}</td>
                        <td style={styles.td}>
                          <div style={styles.celdaMaquina}>
                            {fila.maquina_real}
                            {estaActiva && <span style={styles.indicadorActivo}>🎯</span>}
                            {esMaquinaFiltrada && !estaActiva && <span style={styles.indicadorSeleccionada}>👉</span>}
                          </div>
                        </td>

                        {tiposScrap.map(tipo => {
                          const valor = fila[tipo.columna_db];
                          const celdaEstaActiva = estaActiva && campoBasculaActivo === tipo.columna_db;
                          const esCampoBasculaActivo = campoBasculaActivo === tipo.columna_db;

                          return (
                            <td key={tipo.columna_db} style={styles.td}>
                              <input
                                type="number"
                                step="0.001"
                                value={valor || ''}
                                onChange={(e) => handleInputChangeTabla(realIndex, tipo.columna_db, e.target.value)}
                                onFocus={() => {
                                  activarCeldaParaBascula(realIndex, tipo.columna_db);
                                  setCampoBasculaActivo(tipo.columna_db);
                                }}
                                style={{
                                  ...styles.celdaInput,
                                  ...(valor > 0 ? styles.celdaConDatos : {}),
                                  ...(celdaEstaActiva ? styles.celdaInputActiva : {}),
                                  ...(esCampoBasculaActivo && !celdaEstaActiva ? styles.celdaCampoSeleccionado : {}),
                                  ...(esMaquinaFiltrada ? styles.celdaMaquinaFiltrada : {})
                                }}
                                placeholder="0.0"
                              />
                              {celdaEstaActiva && (
                                <div style={styles.indicadorPesoActivo}>⚖️</div>
                              )}
                            </td>
                          );
                        })}

                        <td style={styles.tdTotal}>
                          <strong>{fila.peso_total.toFixed(3)}</strong>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Fila de totales */}
                  <tr style={styles.trTotal}>
                    <td style={styles.tdTotal} colSpan="2">
                      <strong>TOTAL GENERAL</strong>
                    </td>
                    {tiposScrap.map(tipo => (
                      <td key={tipo.columna_db} style={styles.tdTotal}>
                        <strong>{totales[tipo.columna_db].toFixed(3)}</strong>
                      </td>
                    ))}
                    <td style={styles.tdTotalGeneral}>
                      <strong>{totales.general.toFixed(3)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PANEL DE ACCIONES */}
        <div style={styles.actionsPanel}>
          <div style={styles.actionsContent}>
            <div style={styles.summary}>
              <span style={styles.summaryText}>
                📋 Resumen: <strong>{filasConPeso}</strong> registros listos para guardar |
                Peso Total: <strong>{totales.general.toFixed(3)} kg</strong>
              </span>
            </div>
            <div style={styles.actions}>
              <button
                type="button"
                onClick={onCancelar}
                style={styles.btnSecondary}
              >
                ❌ Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !formData.turno || filasConPeso === 0}
                style={{
                  ...styles.btnPrimary,
                  ...(enviando || !formData.turno || filasConPeso === 0 ? styles.btnDisabled : {})
                }}
              >
                {enviando ? '⏳ Guardando...' : `💾 Guardar ${filasConPeso} Registros`}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },

  header: {
    textAlign: 'center',
    marginBottom: '1rem'
  },

  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },

  subtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    margin: '0.5rem 0 0 0'
  },

  formPrincipal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    flex: 1
  },

  loading: {
    padding: '3rem',
    textAlign: 'center',
    fontSize: '1.3rem',
    color: '#64748b'
  },

  /* -------------------- PANELES PRINCIPALES -------------------- */
  controlsPanel: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '1.5rem',
    alignItems: 'start'
  },

  basculaSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0'
  },

  configSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  configGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },

  /* -------------------- SECCIÓN PREGUARDADO -------------------- */
  preguardadoSection: {
    gridColumn: '1 / -1',
    padding: '1rem',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    marginTop: '0.5rem'
  },

  preguardadoButtons: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },

  btnPreguardar: {
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    ':disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    }
  },

  btnLimpiarPreguardado: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600'
  },

  preguardadoInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },

  preguardadoText: {
    fontSize: '0.8rem',
    color: '#0369a1',
    fontWeight: '500'
  },

  btnDesbloquear: {
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600'
  },

  bloqueoInfo: {
    padding: '0.5rem',
    backgroundColor: '#FEF3C7',
    border: '1px solid #F59E0B',
    borderRadius: '6px',
    marginTop: '0.5rem'
  },

  bloqueoText: {
    fontSize: '0.8rem',
    color: '#92400E',
    fontWeight: '500'
  },

  /* -------------------- INDICADOR DE MÁQUINA ACTIVA -------------------- */
  activeMachineIndicator: {
    padding: '1rem',
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    borderRadius: '8px',
    marginTop: '0.5rem'
  },

  indicatorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },

  indicatorIcon: {
    fontSize: '1.2rem'
  },

  indicatorTitle: {
    color: '#0369a1',
    fontSize: '0.9rem'
  },

  indicatorDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },

  indicatorText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: '1rem'
  },

  indicatorSubtext: {
    color: '#64748b',
    fontSize: '0.8rem',
    fontStyle: 'italic'
  },

  /* -------------------- PANEL DE DATOS -------------------- */
  dataPanel: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },

  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },

  tableStats: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.9rem',
    color: '#64748b'
  },

  statItem: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  },

  /* -------------------- TABLA MEJORADA -------------------- */
  tablaContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden'
  },

  tablaWrapper: {
    overflowX: 'auto',
    overflowY: 'auto',
    flex: 1
  },

  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px'
  },

  th: {
    backgroundColor: '#1e293b',
    color: 'white',
    padding: '0.75rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    textAlign: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderRight: '1px solid #334155',
    whiteSpace: 'nowrap'
  },

  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },

  filaActiva: {
    backgroundColor: '#fffbeb',
    borderLeft: '4px solid #f59e0b'
  },

  filaSeleccionada: {
    backgroundColor: '#f0f9ff',
    borderLeft: '4px solid #0ea5e9'
  },

  trTotal: {
    backgroundColor: '#1e40af',
    color: 'white',
    fontWeight: 'bold',
    position: 'sticky',
    bottom: 0,
    zIndex: 5
  },

  td: {
    padding: '0.6rem',
    textAlign: 'center',
    borderRight: '1px solid #f1f5f9',
    fontSize: '0.85rem'
  },

  tdTotal: {
    padding: '0.75rem',
    backgroundColor: '#f8fafc',
    fontWeight: '600',
    fontSize: '0.9rem'
  },

  tdTotalGeneral: {
    backgroundColor: '#1e40af',
    color: 'white',
    fontWeight: '700',
    padding: '0.75rem',
    fontSize: '0.9rem'
  },

  celdaInput: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#fafafa',
    textAlign: 'right',
    fontSize: '0.85rem',
    transition: 'all 0.2s ease',
    minWidth: '80px'
  },

  celdaInputActiva: {
    backgroundColor: 'white',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
  },

  celdaConDatos: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontWeight: '600',
    borderColor: '#bbf7d0'
  },

  celdaMaquinaFiltrada: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f8fafc'
  },

  celdaMaquina: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: '600',
    fontSize: '0.85rem'
  },

  indicadorActivo: {
    fontSize: '0.8rem',
    animation: 'pulse 2s infinite'
  },

  indicadorSeleccionada: {
    fontSize: '0.8rem',
    color: '#0ea5e9'
  },

  /* -------------------- PANEL DE ACCIONES -------------------- */
  actionsPanel: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    position: 'sticky',
    bottom: '1rem',
    marginTop: 'auto'
  },

  actionsContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem'
  },

  summary: {
    flex: 1
  },

  summaryText: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#374151'
  },

  actions: {
    display: 'flex',
    gap: '1rem'
  },

  /* -------------------- COMPONENTES DE FORMULARIO -------------------- */
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.25rem'
  },

  input: {
    width: '100%',
    padding: '0.6rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s'
  },

  select: {
    width: '100%',
    padding: '0.6rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    transition: 'border-color 0.2s'
  },

  /* -------------------- BOTONES -------------------- */
  btnPrimary: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },

  btnSecondary: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f8fafc',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  btnDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  celdaCampoSeleccionado: {
    border: '2px solid #f59e0b',
    backgroundColor: '#fffbeb'
  },

  indicadorPesoActivo: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    fontSize: '0.7rem',
    animation: 'pulse 1s infinite'
  },
};

// Agregar animación CSS para el indicador activo
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`, styleSheet.cssRules.length);

export default RegistroScrapCompleto;