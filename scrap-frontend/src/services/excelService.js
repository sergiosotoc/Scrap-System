/* src/services/excelService.js - NOMBRE CORREGIDO EN FRONTEND */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getAuthToken = () => localStorage.getItem('authToken');

export const excelService = {
    exportFormatoEmpresa: async (fecha, turno = null) => {
        try {
            const params = new URLSearchParams({ fecha });
            if (turno) params.append('turno', turno);
            
            const token = getAuthToken();
            const url = `${API_BASE_URL}/excel/export-formato-empresa?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

            const blob = await response.blob();
            
            const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            const [year, month, day] = fecha.split('-'); 
            const mesTexto = meses[parseInt(month) - 1];
            let turnoTexto = 'TODOS LOS TURNOS';
            if (String(turno) === '1') turnoTexto = 'PRIMER TURNO';
            if (String(turno) === '2') turnoTexto = 'SEGUNDO TURNO';
            if (String(turno) === '3') turnoTexto = 'TERCER TURNO';

            return {
                data: blob,
                fileName: `FORMATO SCRAP ${day} DE ${mesTexto} ${year} ${turnoTexto}.xlsx`
            };
        } catch (error) {
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
                if (response.status === 404) throw new Error('404 No hay datos');
                throw new Error(`Error ${response.status}`);
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