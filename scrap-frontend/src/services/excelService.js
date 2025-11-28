/* src/services/excelService.js - AGREGAR LOGS */
export const excelService = {
    exportFormatoEmpresa: async (fecha, turno = null) => {
        try {
            const params = new URLSearchParams({ fecha });
            if (turno) params.append('turno', turno);
            
            const token = localStorage.getItem('authToken');
            const url = `http://localhost:8000/api/excel/export-formato-empresa?${params.toString()}`;

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
            
            // DEBUG: Ver headers
            console.log('📋 Headers de respuesta:', {
                'content-disposition': response.headers.get('content-disposition'),
                'content-type': response.headers.get('content-type')
            });

            const contentDisposition = response.headers.get('content-disposition');
            let fileName = 'CONTROL_SCRAP_' + new Date().toISOString().split('T')[0] + '.xlsx';
            
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                    console.log('📁 Nombre de archivo desde header:', fileName);
                }
            }

            console.log('✅ Archivo listo para descargar:', fileName);
            
            return {
                data: blob,
                headers: {
                    'content-disposition': contentDisposition
                },
                fileName: fileName
            };
            
        } catch (error) {
            console.error('💥 Error en exportFormatoEmpresa:', error);
            throw error;
        }
    }
};