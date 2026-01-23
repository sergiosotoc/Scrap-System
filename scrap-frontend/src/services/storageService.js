// src/services/storageService.js

const STORAGE_KEY = 'scrap_registro_draft';
const TURNO_KEY = 'scrap_current_turno';
const FECHA_KEY = 'scrap_current_fecha';
const MODAL_STATE_KEY = 'scrap_modal_open'; // Nueva clave para saber si el modal estaba abierto

export const storageService = {
  // Obtener turno actual según hora
  getCurrentTurno() {
    const hora = new Date().getHours();
    if (hora >= 7 && hora < 15) return '1';
    else if (hora >= 15 && hora < 23) return '2';
    else return '3';
  },

  // Obtener fecha actual en formato YYYY-MM-DD
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  },

  // Verificar si ha cambiado el turno o fecha
  hasTurnoChanged() {
    const storedTurno = localStorage.getItem(TURNO_KEY);
    const storedDate = localStorage.getItem(FECHA_KEY);
    const currentTurno = this.getCurrentTurno();
    const currentDate = this.getCurrentDate();

    return storedTurno !== currentTurno || storedDate !== currentDate;
  },

  // Actualizar turno y fecha actuales
  updateCurrentSession() {
    localStorage.setItem(TURNO_KEY, this.getCurrentTurno());
    localStorage.setItem(FECHA_KEY, this.getCurrentDate());
  },

  // Marcar que el modal está abierto
  markModalOpened() {
    localStorage.setItem(MODAL_STATE_KEY, 'true');
  },

  // Marcar que el modal está cerrado
  markModalClosed() {
    localStorage.removeItem(MODAL_STATE_KEY);
  },

  // Verificar si el modal estaba abierto anteriormente
  wasModalOpen() {
    return localStorage.getItem(MODAL_STATE_KEY) === 'true';
  },

  // Guardar datos del formulario (solo cuando se presiona lectura)
  saveDraftDataOnDemand(data) {
    try {
      const sessionData = {
        data,
        timestamp: new Date().toISOString(),
        turno: this.getCurrentTurno(),
        fecha: this.getCurrentDate(),
        savedManually: true // Marcar que fue guardado manualmente
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      this.updateCurrentSession();
      return true;
    } catch (error) {
      console.error('Error guardando datos en localStorage:', error);
      return false;
    }
  },

  // Guardar datos automáticamente (sin notificación)
  saveDraftDataAuto(data) {
    try {
      const sessionData = {
        data,
        timestamp: new Date().toISOString(),
        turno: this.getCurrentTurno(),
        fecha: this.getCurrentDate(),
        savedManually: false // Marcar que fue guardado automáticamente
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error('Error guardando datos automáticamente:', error);
      return false;
    }
  },

  // Cargar datos guardados (solo si el modal estaba abierto antes)
  loadDraftData() {
    try {
      // Verificar si ha cambiado el turno/fecha
      if (this.hasTurnoChanged()) {
        this.clearDraftData();
        this.updateCurrentSession();
        return null;
      }

      // Solo cargar si el modal estaba abierto antes
      if (!this.wasModalOpen()) {
        return null;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Verificar que los datos sean del mismo turno y fecha
      if (parsed.turno !== this.getCurrentTurno() || parsed.fecha !== this.getCurrentDate()) {
        this.clearDraftData();
        return null;
      }

      // Verificar que no sean datos muy antiguos (más de 8 horas)
      const storedTime = new Date(parsed.timestamp);
      const currentTime = new Date();
      const hoursDiff = Math.abs(currentTime - storedTime) / 36e5; // horas
      
      if (hoursDiff > 8) {
        this.clearDraftData();
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Error cargando datos de localStorage:', error);
      return null;
    }
  },

  // Limpiar datos guardados
  clearDraftData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TURNO_KEY);
    localStorage.removeItem(FECHA_KEY);
    localStorage.removeItem(MODAL_STATE_KEY);
  },

  // Limpiar solo datos pero mantener turno/fecha (para cuando se envía correctamente)
  clearDraftDataOnly() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MODAL_STATE_KEY);
  },

  // Verificar si hay datos guardados
  hasDraftData() {
    if (this.hasTurnoChanged()) {
      this.clearDraftData();
      return false;
    }
    return !!localStorage.getItem(STORAGE_KEY);
  }
};