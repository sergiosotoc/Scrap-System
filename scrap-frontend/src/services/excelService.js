/* src/services/excelService.js - CORREGIDO PARA IP DINÁMICA */

// 1. FUNCIÓN DE DETECCIÓN INTELIGENTE
// Detecta si estás en localhost, 192.168.x.x o dominio y fuerza el puerto 8002
const getBaseUrl = () => {
    // Si existe una variable de entorno forzada, la usamos
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // Lógica dinámica: Usa la misma IP/Dominio del navegador pero en puerto 8002
    const protocol = window.location.protocol; // 'http:'
    const hostname = window.location.hostname; // '192.168.80.191' o 'localhost'
    
    return `${protocol}//${hostname}:8002/api`;
};

const API_BASE_URL = getBaseUrl();

const getAuthToken = () => localStorage.getItem('authToken');

export const excelService = {
    exportFormatoEmpresa: async (fecha, turno = null) => {
        try {
            const params = new URLSearchParams({ fecha });
            if (turno) params.append('turno', turno);
            
            const token = getAuthToken();
            const url = `${API_BASE_URL}/excel/export-formato-empresa?${params.toString()}`;

            console.log('📤 Solicitando Excel a:', url); // Para depuración

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (!response.ok) {
                // Intentar leer el error si es JSON, sino lanzar texto genérico
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.message || `Error ${response.status}`);
                } catch {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
            }

            const blob = await response.blob();
            
            // Generación de nombre de archivo legible
            const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            const [year, month, day] = fecha.split('-'); 
            const mesTexto = meses[parseInt(month) - 1] || 'MES';
            let turnoTexto = 'TODOS LOS TURNOS';
            if (String(turno) === '1') turnoTexto = 'PRIMER TURNO';
            if (String(turno) === '2') turnoTexto = 'SEGUNDO TURNO';
            if (String(turno) === '3') turnoTexto = 'TERCER TURNO';

            return {
                data: blob,
                fileName: `REPORTE SCRAP ${day} DE ${mesTexto} ${year} ${turnoTexto}.xlsx`
            };
        } catch (error) {
            console.error('Error exportando:', error);
            throw error;
        }
    },

    exportRecepciones: async (fechaInicio, fechaFin, destino = '') => {
        try {
            const params = new URLSearchParams({ 
                fecha_inicio: fechaInicio, 
                fecha_fin: fechaFin 
            });
            if (destino) params.append('destino', destino);

            const token = getAuthToken();
            const url = `${API_BASE_URL}/excel/export-recepciones?${params.toString()}`;

            console.log('📤 Exportando recepciones:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error('No se encontraron registros para generar el reporte.');
                throw new Error(`Error ${response.status}: Error al descargar el archivo.`);
            }

            const blob = await response.blob();
            
            let sufijoDestino = "GENERAL";
            if (destino) {
                sufijoDestino = destino.toUpperCase();
            }

            const fileName = `REPORTE RECEPCIONES ${fechaInicio} AL ${fechaFin} ${sufijoDestino}.xlsx`;

            return {
                data: blob,
                fileName: fileName
            };
        } catch (error) {
            console.error('💥 Error exportando recepciones:', error);
            throw error;
        }
    }
};