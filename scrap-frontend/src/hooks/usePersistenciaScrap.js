// src/hooks/usePersistenciaScrap.js

import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

export const usePersistenciaScrap = (config) => {
  const [datosGuardados, setDatosGuardados] = useState(null);
  const [cargandoDesdeStorage, setCargandoDesdeStorage] = useState(false);

  const cargarDatosGuardados = useCallback(() => {
    const saved = storageService.loadDraftData();
    setDatosGuardados(saved);
    return saved;
  }, []);

  const guardarDatos = useCallback((datos) => {
    if (datos && Object.keys(datos).length > 0) {
      const success = storageService.saveDraftData(datos);
      return success;
    }
    return false;
  }, []);

  const limpiarDatos = useCallback(() => {
    storageService.clearDraftData();
    setDatosGuardados(null);
  }, []);

  const tieneDatosGuardados = useCallback(() => {
    return storageService.hasDraftData();
  }, []);

  useEffect(() => {
    setCargandoDesdeStorage(true);
    const saved = cargarDatosGuardados();
    if (saved) {
      setDatosGuardados(saved);
    }
    setCargandoDesdeStorage(false);
  }, [cargarDatosGuardados]);

  return {
    datosGuardados,
    cargandoDesdeStorage,
    cargarDatosGuardados,
    guardarDatos,
    limpiarDatos,
    tieneDatosGuardados,
    haCambiadoTurno: storageService.hasTurnoChanged()
  };
};