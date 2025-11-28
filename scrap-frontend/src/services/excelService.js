/* src/services/excelService.js */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getAuthToken = () => localStorage.getItem('authToken');

export const excelService = {
    /**
     * Exportar registros de scrap a Excel
     */
    async exportRegistros(filters = {}) {
        try {
            const token = getAuthToken();
            
            // Construir parámetros de consulta
            const params = new URLSearchParams();
            if (filters.area) params.append('area', filters.area);
            if (filters.turno) params.append('turno', filters.turno);
            if (filters.fecha) params.append('fecha', filters.fecha);

            const url = `${API_BASE_URL}/excel/export-registros?${params.toString()}`;
            
            console.log('📊 Solicitando exportación de registros:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (response.status === 404) {
                throw new Error('404: No hay registros para exportar con los filtros seleccionados');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error del servidor:', errorText);
                throw new Error(`${response.status}: Error al generar el reporte`);
            }

            // Obtener el nombre del archivo del header
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = 'registros_scrap.xlsx';
            
            if (contentDisposition) {
                const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (matches && matches[1]) {
                    fileName = matches[1].replace(/['"]/g, '');
                }
            }

            const blob = await response.blob();
            
            return {
                data: blob,
                fileName: fileName
            };

        } catch (error) {
            console.error('❌ Error en exportRegistros:', error);
            throw error;
        }
    },

    /**
     * Exportar reporte diario a Excel
     */
    async exportReporteDiario(fecha, turno = null) {
        try {
            const token = getAuthToken();
            
            const params = new URLSearchParams();
            params.append('fecha', fecha);
            if (turno) params.append('turno', turno);

            const url = `${API_BASE_URL}/excel/export-reporte-diario?${params.toString()}`;
            
            console.log('📊 Solicitando reporte diario:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (response.status === 404) {
                throw new Error('404: No hay registros para la fecha seleccionada');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error del servidor:', errorText);
                throw new Error(`${response.status}: Error al generar el reporte diario`);
            }

            const contentDisposition = response.headers.get('content-disposition');
            let fileName = `reporte_diario_${fecha}.xlsx`;
            
            if (contentDisposition) {
                const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (matches && matches[1]) {
                    fileName = matches[1].replace(/['"]/g, '');
                }
            }

            const blob = await response.blob();
            
            return {
                data: blob,
                fileName: fileName
            };

        } catch (error) {
            console.error('❌ Error en exportReporteDiario:', error);
            throw error;
        }
    }
};