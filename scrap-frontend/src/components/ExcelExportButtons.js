/* src/components/ExcelExportButtons.js */
import React, { useState } from 'react';
import { excelService } from '../services/excelService';
import { useToast } from '../context/ToastContext';

const ExcelExportButtons = ({ tipo, filters = {} }) => {
    const [exportando, setExportando] = useState(false);
    const { addToast } = useToast();

    const handleExport = async () => {
        setExportando(true);
        try {
            let resultado;
            
            switch (tipo) {
                case 'registros':
                    resultado = await excelService.exportRegistros(filters);
                    break;
                case 'recepciones':
                    resultado = await excelService.exportRecepciones(filters);
                    break;
                case 'diario':
                    resultado = await excelService.exportReporteDiario(filters.fecha, filters.turno);
                    break;
                default:
                    throw new Error('Tipo de exportación no válido');
            }

            // Crear URL para descarga
            const url = window.URL.createObjectURL(new Blob([resultado.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', resultado.fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            addToast(`✅ Reporte Excel generado exitosamente: ${resultado.fileName}`, 'success');
            
        } catch (error) {
            console.error('❌ Error exportando Excel:', error);
            
            if (error.message.includes('404')) {
                addToast('⚠️ No hay datos para exportar con los filtros seleccionados', 'warning');
            } else if (error.message.includes('500')) {
                addToast('❌ Error del servidor al generar el reporte', 'error');
            } else {
                addToast(`❌ Error al exportar: ${error.message}`, 'error');
            }
        } finally {
            setExportando(false);
        }
    };

    const getButtonText = () => {
        const baseText = '📊 Exportar Excel';
        if (exportando) {
            return '⏳ Generando...';
        }
        return baseText;
    };

    return (
        <button 
            onClick={handleExport}
            disabled={exportando}
            title="Exportar a Excel"
            style={{
                backgroundColor: exportando ? '#6B7280' : '#10B981',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: exportando ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: exportando ? 0.7 : 1,
                transition: 'all 0.2s ease'
            }}
        >
            {getButtonText()}
        </button>
    );
};

export default ExcelExportButtons;