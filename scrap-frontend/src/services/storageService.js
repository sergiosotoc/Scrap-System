// src/services/storageService.js

const STORAGE_KEY = 'scrap_registro_draft';
const TURNO_KEY = 'scrap_current_turno';
const FECHA_KEY = 'scrap_current_fecha';

export const storageService = {


  getCurrentTurno() {
    const hora = new Date().getHours();
    if (hora >= 7 && hora < 15) return '1';
    if (hora >= 15 && hora < 23) return '2';
    return '3';
  },

  getCurrentDate() {
    // Usamos la fecha local para evitar problemas con UTC si es turno de noche tarde
    const now = new Date();

    return now.toISOString().split('T')[0];
  },

  /* ================================
     VALIDACIÓN DE SESIÓN
  ================================= */

  /**
   * Verifica si los datos guardados pertenecen al turno y fecha actuales.
   * Retorna true si los datos son obsoletos.
   */
  isSessionExpired(storedTurno, storedFecha) {
    const currentTurno = this.getCurrentTurno();
    const currentDate = this.getCurrentDate();

    return storedTurno !== currentTurno || storedFecha !== currentDate;
  },

  /* ================================
     GUARDADO DE DATOS
  ================================= */

  /**
   * Guarda los datos en localStorage.
   * @param {Object} data - El objeto con los datos del formulario
   * @param {boolean} isManual - Si fue guardado por botón (true) o auto-save (false)
   */
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
      
      // Guardamos referencias planas también por si se necesitan leer rápido
      localStorage.setItem(TURNO_KEY, currentTurno);
      localStorage.setItem(FECHA_KEY, currentDate);
      
      return true;
    } catch (error) {
      console.error('Error guardando draft:', error);
      return false;
    }
  },

  /* ================================
     CARGA DE DATOS
  ================================= */

  /**
   * Intenta recuperar los datos. 
   * Realiza limpieza automática si los datos son de un turno anterior o muy viejos.
   */
  loadDraftData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      // 1. Si no hay datos, retornamos null
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // 2. Validación de Turno y Fecha
      if (this.isSessionExpired(parsed.turno, parsed.fecha)) {
        console.warn('Draft encontrado pero pertenece a otro turno/fecha. Limpiando...');
        this.clearDraftData();
        return null;
      }

      // 3. Validación de Tiempo (Expiración por horas - ej. 8 horas)
      const storedTime = new Date(parsed.timestamp).getTime();
      const hoursDiff = (Date.now() - storedTime) / (1000 * 60 * 60);

      if (hoursDiff > 8) {
        console.warn('Draft expirado por tiempo (> 8 horas). Limpiando...');
        this.clearDraftData();
        return null;
      }

      // Si pasa todas las validaciones, retornamos los datos limpios
      return parsed.data;

    } catch (error) {
      console.error('Error cargando draft:', error);
      // Si el JSON está corrupto, mejor limpiar
      this.clearDraftData(); 
      return null;
    }
  },

  /* ================================
     LIMPIEZA Y ESTADO
  ================================= */

  clearDraftData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TURNO_KEY);
    localStorage.removeItem(FECHA_KEY);
  },

  /**
   * Método ligero para verificar si existe un draft válido sin parsear todo el JSON.
   * Útil para mostrar botones tipo "Continuar borrador" en la UI.
   */
  hasValidDraft() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    // Verificación rápida de turno actual contra lo guardado plano
    const storedTurno = localStorage.getItem(TURNO_KEY);
    const storedFecha = localStorage.getItem(FECHA_KEY);
    
    if (this.isSessionExpired(storedTurno, storedFecha)) {
      return false;
    }

    return true;
  }
};