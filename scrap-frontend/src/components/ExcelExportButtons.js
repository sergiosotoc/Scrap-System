/* src/components/ExcelExportButtons.js */
import React, { useState } from 'react';
import { excelService } from '../services/excelService';
import { useToast } from '../context/ToastContext';
import { baseComponents, colors, spacing, typography, radius } from '../styles/designSystem';

const ExcelExportButtons = ({ tipo, filters = {}, buttonText = "📊 Generar Reporte", buttonStyle = {} }) => {
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

    const getButtonText = () => {
        if (exportando) {
            return '⏳ Generando...';
        }
        return buttonText;
    };

    // Estilos mejorados
    const styles = {
        button: {
            ...baseComponents.buttonPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm} ${spacing.md}`,
            height: '36px',
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.semibold,
            backgroundColor: exportando ? colors.gray400 : colors.success,
            border: `1px solid ${exportando ? colors.gray400 : colors.success}`,
            borderRadius: radius.md,
            cursor: exportando ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: exportando ? 0.7 : 1,
            transform: exportando ? 'none' : 'translateY(0)',
            boxShadow: exportando ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
            ':hover': exportando ? {} : {
                backgroundColor: colors.secondaryHover,
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            },
            ...buttonStyle
        }
    };

    return (
        <button 
            onClick={handleExport}
            disabled={exportando}
            title="Generar Reporte en Excel"
            style={styles.button}
        >
            {getButtonText()}
        </button>
    );
};

export default ExcelExportButtons;