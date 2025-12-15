/* src/components/MaterialesManagment.js */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { colors, radius, spacing, typography, baseComponents, shadows } from '../styles/designSystem';
import SmoothButton from './SmoothButton';
import SmoothInput from './SmoothInput';
import SmoothSelect from './SmoothSelect';
import LoadingSpinner from './LoadingSpinner';
import CardTransition from './CardTransition'; 

const MaterialesManagement = () => {
    const { addToast } = useToast();
    const [materiales, setMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estado para el formulario
    const [nuevoMaterial, setNuevoMaterial] = useState({ tipo_nombre: '', uso: 'receptor' });
    
    // Estado para eliminación
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, nombre: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [enviando, setEnviando] = useState(false);
    
    const [triggerAnimation, setTriggerAnimation] = useState(false);
    const dataFetchedRef = useRef(false);

    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.keyCode === 27 && deleteModal.show) {
                setDeleteModal({ show: false, id: null, nombre: '' });
            }
        };

        if (deleteModal.show) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { 
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset'; 
        };
    }, [deleteModal.show]);

    const fetchMateriales = async () => {
        try {
            if (materiales.length === 0) setLoading(true);
            const data = await apiClient.getAllMateriales();
            setMateriales(data);
            setTimeout(() => setTriggerAnimation(true), 100);
        } catch (error) {
            addToast('Error al cargar materiales', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (dataFetchedRef.current) return;
        dataFetchedRef.current = true;
        fetchMateriales();
    }, []);

    // Configuración visual por tipo de uso
    const usageConfig = {
        operador: { 
            label: 'Materiales Operador', 
            color: colors.primary, // Azul
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            )
        },
        receptor: { 
            label: 'Materiales Receptor', 
            color: colors.secondary, // Verde
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            )
        },
        ambos: { 
            label: 'Uso Compartido', 
            color: '#8B5CF6', // Violeta
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            )
        }
    };

    // Agrupación y filtrado
    const groupedMateriales = useMemo(() => {
        const filtered = materiales.filter(m => 
            m.tipo_nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const groups = {
            operador: [],
            receptor: [],
            ambos: []
        };

        filtered.forEach(m => {
            if (groups[m.uso]) {
                groups[m.uso].push(m);
            }
        });

        // Ordenar alfabéticamente dentro del grupo
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => a.tipo_nombre.localeCompare(b.tipo_nombre));
        });

        return groups;
    }, [materiales, searchTerm]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!nuevoMaterial.tipo_nombre.trim()) {
            addToast('El nombre es obligatorio', 'warning');
            return;
        }

        setEnviando(true);
        try {
            await apiClient.createMaterial(nuevoMaterial);
            addToast('Material agregado correctamente', 'success');
            setNuevoMaterial({ ...nuevoMaterial, tipo_nombre: '' }); // Mantener el "uso" seleccionado para capturar varios seguidos
            fetchMateriales();
        } catch (error) {
            addToast('Error al crear: ' + error.message, 'error');
        } finally {
            setEnviando(false);
        }
    };

    const requestDelete = (id, nombre) => {
        setDeleteModal({ show: true, id, nombre });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        setIsDeleting(true);
        try {
            await apiClient.deleteMaterial(deleteModal.id);
            addToast('Material eliminado correctamente', 'success');
            fetchMateriales();
            setDeleteModal({ show: false, id: null, nombre: '' });
        } catch (error) {
            addToast('Error al eliminar: ' + error.message, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const styles = {
        container: { ...baseComponents.card, padding: spacing.lg, border: `1px solid ${colors.gray200}`, minHeight: '600px', backgroundColor: '#FAFAFA' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, flexWrap: 'wrap', gap: spacing.md },
        titleContainer: { display: 'flex', flexDirection: 'column', gap: '4px' },
        title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.gray900, margin: 0 },
        subtitle: { fontSize: typography.sizes.sm, color: colors.gray500 },
        
        searchContainer: { width: '100%', maxWidth: '320px' },

        // Formulario
        formCard: { 
            backgroundColor: colors.surface, 
            padding: spacing.lg, 
            borderRadius: radius.lg, 
            border: `1px solid ${colors.primaryLight}`, 
            marginBottom: spacing.xl,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md,
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.05)',
            position: 'relative',
            overflow: 'hidden'
        },
        formAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: colors.primary },
        formHeader: {
            fontSize: typography.sizes.sm, 
            fontWeight: 'bold', 
            color: colors.primary, 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em', 
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm
        },
        formRow: { display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' },

        // Grid
        gridContainer: { 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: spacing.lg 
        },
        usageCard: (index, color) => ({
            backgroundColor: colors.surface,
            border: `1px solid ${colors.gray200}`,
            borderTop: `4px solid ${color}`,
            borderRadius: radius.lg,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: shadows.sm,
            opacity: triggerAnimation ? 1 : 0,
            transform: triggerAnimation ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transitionDelay: `${index * 0.05}s`
        }),
        usageHeader: {
            backgroundColor: '#F8FAFC',
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${colors.gray200}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        usageTitleGroup: { display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.gray700 },
        usageTitle: { fontSize: typography.sizes.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' },
        countBadge: (color) => ({
            fontSize: '0.65rem',
            backgroundColor: color + '20', // Opacidad
            color: color,
            padding: '2px 8px',
            borderRadius: radius.full,
            fontWeight: '700',
            minWidth: '20px',
            textAlign: 'center'
        }),
        materialsList: {
            padding: spacing.md,
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.xs,
            alignContent: 'flex-start',
            flex: 1
        },
        materialTag: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: '6px 10px 6px 12px',
            backgroundColor: colors.surface,
            color: colors.gray700,
            borderRadius: radius.full,
            fontSize: '0.8rem',
            fontWeight: '500',
            border: `1px solid ${colors.gray200}`,
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        },
        deleteTagBtn: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: colors.gray100,
            border: 'none',
            color: colors.error, // ROJO
            cursor: 'pointer',
            marginLeft: '4px',
            transition: 'all 0.2s ease',
            opacity: 0.8,
            ':hover': {
                backgroundColor: '#FEF2F2',
                opacity: 1,
                transform: 'scale(1.1)'
            }
        },

        emptyState: { 
            gridColumn: '1 / -1', 
            padding: spacing.xl, 
            textAlign: 'center', 
            color: colors.gray500,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            border: `2px dashed ${colors.gray200}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing.md
        },

        // Modal
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, animation: 'fadeIn 0.2s ease-out' },
        alertBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '90%', maxWidth: '400px', boxShadow: shadows.xl, textAlign: 'center', border: `1px solid ${colors.gray200}`, display: 'flex', flexDirection: 'column', gap: spacing.md },
        alertTitle: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.gray900, margin: 0 },
        alertActions: { display: 'flex', gap: spacing.md, justifyContent: 'center', marginTop: spacing.sm }
    };

    if (loading) return <div style={{...baseComponents.card, padding: spacing.xl}}><div style={{display:'flex', justifyContent:'center'}}><LoadingSpinner message="Cargando materiales..." /></div></div>;

    const deleteConfirmationModal = deleteModal.show ? createPortal(
        <div style={styles.overlay} onClick={() => !isDeleting && setDeleteModal({ ...deleteModal, show: false })}>
            <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            <div style={styles.alertBox} onClick={e => e.stopPropagation()}>
                <div style={{color: colors.error, display: 'flex', justifyContent: 'center'}}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div>
                    <h3 style={styles.alertTitle}>¿Eliminar material?</h3>
                    <p style={{color: colors.gray600, margin: '8px 0'}}>
                        Estás a punto de eliminar <strong>"{deleteModal.nombre}"</strong>.
                        <br />
                        <span style={{fontSize: '0.85em', color: colors.error}}>Esto podría afectar reportes históricos.</span>
                    </p>
                </div>
                <div style={styles.alertActions}>
                    <SmoothButton variant="secondary" onClick={() => setDeleteModal({ ...deleteModal, show: false })} disabled={isDeleting} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</SmoothButton>
                    <SmoothButton variant="destructive" onClick={confirmDelete} disabled={isDeleting} style={{ flex: 1, justifyContent: 'center' }}>{isDeleting ? 'Eliminando...' : 'Eliminar'}</SmoothButton>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <CardTransition delay={0} style={styles.container}>
            <div style={styles.header}>
                <div style={styles.titleContainer}>
                    <h3 style={styles.title}>Catálogo de Materiales</h3>
                    <p style={styles.subtitle}>Configura los tipos de scrap disponibles para operación y recepción.</p>
                </div>
                <div style={styles.searchContainer}>
                    <SmoothInput 
                        placeholder="Buscar material..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{height: '40px', backgroundColor: colors.surface}}
                        rightElement={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: colors.gray400}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>}
                    />
                </div>
            </div>

            <form onSubmit={handleCreate} style={styles.formCard}>
                <div style={styles.formAccent}></div>
                <div style={styles.formHeader}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Nuevo Material
                </div>
                <div style={styles.formRow}>
                    <div style={{flex: 2, minWidth: '200px'}}>
                        <SmoothInput 
                            label="NOMBRE DEL MATERIAL" 
                            value={nuevoMaterial.tipo_nombre} 
                            onChange={(e) => setNuevoMaterial({...nuevoMaterial, tipo_nombre: e.target.value})} 
                            placeholder="Ej: Cartón corrugado" 
                            required 
                        />
                    </div>
                    <div style={{flex: 1, minWidth: '150px'}}>
                        <SmoothSelect 
                            label="MÓDULO / USO" 
                            value={nuevoMaterial.uso} 
                            onChange={(e) => setNuevoMaterial({...nuevoMaterial, uso: e.target.value})}
                        >
                            <option value="receptor">Recepción (Solo Receptor)</option>
                            <option value="operador">Operación (Solo Operador)</option>
                            <option value="ambos">Global (Ambos)</option>
                        </SmoothSelect>
                    </div>
                    <div style={{minWidth: '120px'}}>
                        <SmoothButton type="submit" disabled={enviando} style={{height: '38px', width: '100%', justifyContent: 'center'}}>
                            {enviando ? 'Guardando...' : 'Agregar'}
                        </SmoothButton>
                    </div>
                </div>
            </form>

            <div style={styles.gridContainer}>
                {['operador', 'receptor', 'ambos'].map((usageKey, index) => {
                    const materials = groupedMateriales[usageKey] || [];
                    const config = usageConfig[usageKey];
                    
                    // Si hay búsqueda y no hay resultados en este grupo, no lo mostramos para limpiar la vista
                    if (materials.length === 0 && searchTerm) return null;

                    return (
                        <div key={usageKey} style={styles.usageCard(index, config.color)}>
                            <div style={styles.usageHeader}>
                                <div style={styles.usageTitleGroup}>
                                    <span style={{color: config.color}}>{config.icon}</span>
                                    <span style={styles.usageTitle}>{config.label}</span>
                                </div>
                                <span style={styles.countBadge(config.color)}>{materials.length}</span>
                            </div>
                            <div style={styles.materialsList}>
                                {materials.map(m => (
                                    <div key={m.id} style={styles.materialTag}>
                                        {m.tipo_nombre}
                                        <button 
                                            type="button"
                                            onClick={() => requestDelete(m.id, m.tipo_nombre)} 
                                            style={styles.deleteTagBtn}
                                            title="Eliminar material"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                ))}
                                {materials.length === 0 && (
                                    <div style={{width: '100%', textAlign: 'center', padding: spacing.md, color: colors.gray400, fontSize: typography.sizes.xs, fontStyle: 'italic'}}>
                                        No hay materiales configurados
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {Object.values(groupedMateriales).every(g => g.length === 0) && (
                    <div style={styles.emptyState}>
                        <div style={{marginBottom: '10px'}}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.gray300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </div>
                        <h4 style={{margin: '0 0 4px 0', color: colors.gray700}}>No se encontraron resultados</h4>
                        <p style={{margin: 0, fontSize: '0.9rem'}}>No hay materiales que coincidan con tu búsqueda.</p>
                    </div>
                )}
            </div>

            {deleteConfirmationModal}
        </CardTransition>
    );
};

export default MaterialesManagement;