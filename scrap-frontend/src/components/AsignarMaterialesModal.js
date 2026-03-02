/* src/components/AsignarMaterialesModal.js */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { colors, radius, spacing, typography, shadows } from '../styles/designSystem';
import SmoothButton from './SmoothButton';

const AsignarMaterialesModal = ({ isOpen, onClose, area, materialesGlobales, onSave, enviando }) => {
    const [seleccionados, setSeleccionados] = useState([]);

    useEffect(() => {
        if (area && area.materiales_ids) {
            setSeleccionados(area.materiales_ids);
        } else {
            setSeleccionados([]);
        }
    }, [area, isOpen]);

    if (!isOpen) return null;

    const toggleMaterial = (id) => {
        setSeleccionados(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const styles = {
        overlay: { 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 99999,
            backdropFilter: 'blur(4px)',
            padding: spacing.md
        },
        modal: { 
            backgroundColor: colors.surface, 
            borderRadius: radius.xl, 
            width: '100%', 
            maxWidth: '500px', 
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: spacing.xl, 
            boxShadow: shadows.xl, 
            border: `1px solid ${colors.gray200}`, 
            animation: 'slideInUp 0.3s ease-out',
            position: 'relative'
        },
        header: { marginBottom: spacing.lg },
        title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.primary, margin: 0 },
        list: { 
            display: 'flex', 
            flexDirection: 'column', 
            gap: spacing.sm, 
            overflowY: 'auto',
            padding: '4px',
            flex: 1
        },
        item: (isSelected) => ({
            display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, 
            border: `2px solid ${isSelected ? colors.primary : colors.gray200}`,
            backgroundColor: isSelected ? colors.primaryLight + '20' : 'transparent', 
            cursor: 'pointer'
        }),
        footer: { 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: spacing.md, 
            marginTop: spacing.xl, 
            paddingTop: spacing.md, 
            borderTop: `1px solid ${colors.gray100}` 
        }
    };

    return createPortal(
        <div style={styles.overlay} onClick={onClose}>
            <style>{`
                @keyframes slideInUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <h3 style={styles.title}>Materiales del Área</h3>
                    <p style={{ fontSize: typography.sizes.sm, color: colors.gray600 }}>
                        Área: <strong>{area?.area_nombre}</strong>
                    </p>
                    <p style={{ fontSize: typography.sizes.xs, color: colors.gray500 }}>
                        Estos materiales aparecerán en los filtros de registro para todas las máquinas de esta área
                    </p>
                </div>

                <div style={styles.list}>
                    {materialesGlobales.map(mat => (
                        <div key={mat.id} style={styles.item(seleccionados.includes(mat.id))} onClick={() => toggleMaterial(mat.id)}>
                            <input 
                                type="checkbox" 
                                checked={seleccionados.includes(mat.id)} 
                                readOnly 
                                style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                            />
                            <span style={{ fontSize: typography.sizes.sm, fontWeight: seleccionados.includes(mat.id) ? 'bold' : 'normal' }}>
                                {mat.tipo_nombre}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={styles.footer}>
                    <SmoothButton variant="secondary" onClick={onClose} disabled={enviando}>
                        Cancelar
                    </SmoothButton>
                    <SmoothButton 
                        onClick={() => onSave(area, seleccionados)} 
                        disabled={enviando}
                        style={{ backgroundColor: colors.success, color: 'white' }}
                    >
                        {enviando ? 'Guardando...' : 'Guardar Cambios'}
                    </SmoothButton>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AsignarMaterialesModal;