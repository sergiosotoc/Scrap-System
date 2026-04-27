// src/services/storageService.js

import { apiClient } from './api';

const LS_KEY   = 'scrap_registro_draft';
const TURNO_KEY = 'scrap_current_turno';
const FECHA_KEY = 'scrap_current_fecha';

// ─── helpers de turno/fecha ───────────────────────────────────────────────────
const getCurrentTurno = () => {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return '1';
  if (h >= 15 && h < 23) return '2';
  return '3';
};

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const isSessionExpired = (storedTurno, storedFecha) =>
  storedTurno !== getCurrentTurno() || storedFecha !== getCurrentDate();

// ─── capa localStorage (fallback) ────────────────────────────────────────────
const lsGet = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isSessionExpired(parsed.turno, parsed.fecha)) {
      lsClear();
      return null;
    }
    const diffHrs = (Date.now() - new Date(parsed.timestamp).getTime()) / 3_600_000;
    if (diffHrs > 8) { lsClear(); return null; }
    return parsed.data;
  } catch { return null; }
};

const lsSet = (data, turno, fecha) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      data,
      turno,
      fecha,
      timestamp: new Date().toISOString(),
    }));
    localStorage.setItem(TURNO_KEY, turno);
    localStorage.setItem(FECHA_KEY, fecha);
  } catch (e) {
    console.warn('localStorage no disponible:', e);
  }
};

const lsClear = () => {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(TURNO_KEY);
  localStorage.removeItem(FECHA_KEY);
};

// ─── capa remota (archivo JSON en servidor) ───────────────────────────────────
const remoteSave = async (data, turno, fecha) => {
  try {
    await apiClient.request('/draft/save', {
      method: 'POST',
      body: { data, turno, fecha },
    }, 10000);
    return true;
  } catch (e) {
    console.warn('Draft remoto no guardado (se usó localStorage):', e.message);
    return false;
  }
};

const remoteLoad = async (turno, fecha) => {
  try {
    const res = await apiClient.request(
      `/draft/load?turno=${turno}&fecha=${fecha}`,
      {},
      10000
    );
    return res.success ? res.draft : null;
  } catch (e) {
    console.warn('Draft remoto no disponible, usando localStorage:', e.message);
    return null;
  }
};

const remoteClear = async (turno, fecha) => {
  try {
    await apiClient.request(
      `/draft/clear?turno=${turno}&fecha=${fecha}`,
      { method: 'DELETE' },
      10000
    );
  } catch (e) {
    console.warn('No se pudo borrar draft remoto:', e.message);
  }
};

// ─── API pública ──────────────────────────────────────────────────────────────
export const storageService = {
  getCurrentTurno,
  getCurrentDate,
  isSessionExpired,

  /**
   * Guarda el draft:
   * 1. Siempre en localStorage (sincrónico, cero latencia).
   * 2. En paralelo sube al servidor (archivo JSON).
   */
  saveDraft(data, isManual = false) {
    const turno = getCurrentTurno();
    const fecha = getCurrentDate();

    // 1. localStorage inmediato
    lsSet(data, turno, fecha);

    // 2. servidor en background (no bloqueante)
    remoteSave(data, turno, fecha).catch(() => {});

    return true;
  },

  /**
   * Carga el draft al iniciar:
   * Prioridad: servidor → localStorage
   */
  async loadDraftData() {
    const turno = getCurrentTurno();
    const fecha = getCurrentDate();

    // Intento remoto primero
    const remote = await remoteLoad(turno, fecha);
    if (remote) {
      // Sincronizar localStorage con lo que vino del servidor
      lsSet(remote, turno, fecha);
      return remote;
    }

    // Fallback localStorage
    return lsGet();
  },

  /**
   * Borra el draft de ambos lados al hacer submit exitoso.
   */
  async clearDraftData() {
    const turno = getCurrentTurno();
    const fecha = getCurrentDate();

    lsClear();
    await remoteClear(turno, fecha);
  },

  hasValidDraft() {
    const t = localStorage.getItem(TURNO_KEY);
    const f = localStorage.getItem(FECHA_KEY);
    if (!t || !f) return false;
    return !isSessionExpired(t, f);
  },
};