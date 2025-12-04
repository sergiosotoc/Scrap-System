/* src/components/ExcelExportButtons.js */
import React, { useState } from 'react';
import { excelService } from '../services/excelService';
import { useToast } from '../context/ToastContext';
import { colors } from '../styles/designSystem';
import SmoothButton from './SmoothButton';

const ExcelExportButtons = ({ tipo, filters = {}, buttonText = "Generar Reporte", buttonStyle = {} }) => {
    const [exportando, setExportando] = useState(false);
    const { addToast } = useToast();

    const handleExport = async () => {
        setExportando(true);
        try {
            let resultado;
            if (tipo === 'formato-empresa') {
                resultado = await excelService.exportFormatoEmpresa(filters.fecha, filters.turno);
            } else {
                throw new Error('Tipo de exportación no válido');
            }

            const url = window.URL.createObjectURL(new Blob([resultado.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', resultado.fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            addToast(`Reporte generado exitosamente: ${resultado.fileName}`, 'success');
            
        } catch (error) {
            console.error('Error exportando Excel:', error);
            if (error.message.includes('404')) {
                addToast('No hay datos para exportar con los filtros seleccionados', 'warning');
            } else if (error.message.includes('500')) {
                addToast('Error del servidor al generar el reporte', 'error');
            } else {
                addToast(`Error al exportar: ${error.message}`, 'error');
            }
        } finally {
            setExportando(false);
        }
    };

    return (
        <SmoothButton 
            onClick={handleExport}
            disabled={exportando}
            variant="primary" // Esto ya carga baseComponents.buttonPrimary
            title="Generar Reporte en Excel"
            style={{
                height: '36px',
                // Solo sobreescribimos lo necesario (color de éxito o gris)
                backgroundColor: exportando ? colors.gray400 : colors.success,
                opacity: exportando ? 0.7 : 1,
                ...buttonStyle
            }}
        >
            {exportando ? (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation: 'spin 1s linear infinite'}}>
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    <span>Generando...</span>
                </>
            ) : (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    <span>{buttonText}</span>
                </>
            )}
            
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </SmoothButton>
    );
};

export default ExcelExportButtons;