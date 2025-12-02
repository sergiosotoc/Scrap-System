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

            console.log('📤 Exportando formato empresa a Excel:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error en respuesta:', response.status, errorText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            
            // --- GENERACIÓN MANUAL DEL NOMBRE DEL ARCHIVO ---
            // Esto soluciona el problema de que el header no llegue o venga null
            
            const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            // Asumimos formato fecha YYYY-MM-DD
            const [year, month, day] = fecha.split('-'); 
            const mesTexto = meses[parseInt(month) - 1]; // Mes 0-indexado
            
            let turnoTexto = 'TODOS LOS TURNOS';
            // Convertir a string para comparar por si viene como número
            const turnoStr = String(turno);
            if (turnoStr === '1') turnoTexto = 'PRIMER TURNO';
            if (turnoStr === '2') turnoTexto = 'SEGUNDO TURNO';
            if (turnoStr === '3') turnoTexto = 'TERCER TURNO';

            const fileName = `FORMATO SCRAP ${day} DE ${mesTexto} ${year} ${turnoTexto}.xlsx`;

            console.log('✅ Nombre generado en frontend:', fileName);
            
            return {
                data: blob,
                fileName: fileName
            };
            
        } catch (error) {
            console.error('💥 Error en exportFormatoEmpresa:', error);
            throw error;
        }
    }
};