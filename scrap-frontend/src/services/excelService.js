/* src/services/excelService.js */
export const excelService = {
    exportRegistros: async (filters = {}) => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });
            
            const token = localStorage.getItem('authToken');
            const url = `http://localhost:8000/api/excel/export-registros?${params.toString()}`;

            console.log('📤 Exportando registros a Excel:', url);

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
            
            // Obtener nombre del archivo del header
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = 'registros_scrap.xlsx';
            
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }

            return {
                data: blob,
                headers: {
                    'content-disposition': contentDisposition
                },
                fileName: fileName
            };
            
        } catch (error) {
            console.error('💥 Error en exportRegistros:', error);
            throw error;
        }
    },

    exportRecepciones: async (filters = {}) => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });
            
            const token = localStorage.getItem('authToken');
            const url = `http://localhost:8000/api/excel/export-recepciones?${params.toString()}`;

            console.log('📤 Exportando recepciones a Excel:', url);

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
            
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = 'recepciones_scrap.xlsx';
            
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }

            return {
                data: blob,
                headers: {
                    'content-disposition': contentDisposition
                },
                fileName: fileName
            };
            
        } catch (error) {
            console.error('💥 Error en exportRecepciones:', error);
            throw error;
        }
    },

    exportReporteDiario: async (fecha, turno = null) => {
        try {
            const params = new URLSearchParams({ fecha });
            if (turno) params.append('turno', turno);
            
            const token = localStorage.getItem('authToken');
            const url = `http://localhost:8000/api/excel/export-reporte-diario?${params.toString()}`;

            console.log('📤 Exportando reporte diario a Excel:', url);

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
            
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = 'reporte_diario.xlsx';
            
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }

            return {
                data: blob,
                headers: {
                    'content-disposition': contentDisposition
                },
                fileName: fileName
            };
            
        } catch (error) {
            console.error('💥 Error en exportReporteDiario:', error);
            throw error;
        }
    }
};