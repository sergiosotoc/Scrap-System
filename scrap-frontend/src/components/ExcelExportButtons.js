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
            
            // Solo formato empresa
            if (tipo === 'formato-empresa') {
                resultado = await excelService.exportFormatoEmpresa(filters.fecha, filters.turno);
            } else {
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

            addToast(`✅ Formato empresa generado exitosamente: ${resultado.fileName}`, 'success');
            
        } catch (error) {
            console.error('❌ Error exportando Excel:', error);
            
            if (error.message.includes('404')) {
                addToast('⚠️ No hay datos para exportar con los filtros seleccionados', 'warning');
            } else if (error.message.includes('500')) {
                addToast('❌ Error del servidor al generar el formato empresa', 'error');
            } else {
                addToast(`❌ Error al exportar: ${error.message}`, 'error');
            }
        } finally {
            setExportando(false);
        }
    };

    const getButtonText = () => {
        if (exportando) {
            return '⏳ Generando...';
        }
        return '🏢 Formato Empresa';
    };

    return (
        <button 
            onClick={handleExport}
            disabled={exportando}
            title="Exportar Formato Empresa"
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