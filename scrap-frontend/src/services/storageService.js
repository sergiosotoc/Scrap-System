// src/services/storageService.js

const STORAGE_KEY = 'scrap_registro_draft';
const TURNO_KEY = 'scrap_current_turno';
const FECHA_KEY = 'scrap_current_fecha';

export const storageService = {


  getCurrentTurno: () => {
    const hora = new Date().getHours();

    if (hora >= 7 && hora < 15) return '1';
    if (hora >= 15 && hora < 23) return '2';
    return '3';
  },

  getCurrentDate() {
    const now = new Date();

    return now.toISOString().split('T')[0];
  },

  isSessionExpired(storedTurno, storedFecha) {
    const currentTurno = this.getCurrentTurno();
    const currentDate = this.getCurrentDate();

    return storedTurno !== currentTurno || storedFecha !== currentDate;
  },

  saveDraft(data, isManual = false) {
    try {
      const currentTurno = this.getCurrentTurno();
      const currentDate = this.getCurrentDate();

      const sessionData = {
        data,
        timestamp: new Date().toISOString(),
        turno: currentTurno,
        fecha: currentDate,
        savedManually: isManual
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));

      localStorage.setItem(TURNO_KEY, currentTurno);
      localStorage.setItem(FECHA_KEY, currentDate);

      return true;
    } catch (error) {
      console.error('Error guardando draft:', error);
      return false;
    }
  },

  loadDraftData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) return null;

      const parsed = JSON.parse(stored);

      if (this.isSessionExpired(parsed.turno, parsed.fecha)) {
        console.warn('Draft encontrado pero pertenece a otro turno/fecha. Limpiando...');
        this.clearDraftData();
        return null;
      }

      const storedTime = new Date(parsed.timestamp).getTime();
      const hoursDiff = (Date.now() - storedTime) / (1000 * 60 * 60);

      if (hoursDiff > 8) {
        console.warn('Draft expirado por tiempo (> 8 horas). Limpiando...');
        this.clearDraftData();
        return null;
      }

      return parsed.data;

    } catch (error) {
      console.error('Error cargando draft:', error);
      this.clearDraftData();
      return null;
    }
  },

  clearDraftData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TURNO_KEY);
    localStorage.removeItem(FECHA_KEY);
  },

  hasValidDraft() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const storedTurno = localStorage.getItem(TURNO_KEY);
    const storedFecha = localStorage.getItem(FECHA_KEY);

    if (this.isSessionExpired(storedTurno, storedFecha)) {
      return false;
    }

    return true;
  }
};