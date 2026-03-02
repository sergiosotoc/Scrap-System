/* src/components/AreasMaquinasManagement.js */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { colors, radius, spacing, typography, baseComponents, shadows } from '../styles/designSystem';
import SmoothButton from './SmoothButton';
import SmoothInput from './SmoothInput';
import LoadingSpinner from './LoadingSpinner';
import CardTransition from './CardTransition';
import AsignarMaterialesModal from './AsignarMaterialesModal';

const AreasMaquinasManagement = () => {
    const { addToast } = useToast();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [modalAsignacion, setModalAsignacion] = useState({ open: false, area: null });
    const [materialesGlobales, setMaterialesGlobales] = useState([]);
    const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

    const [nuevaConfig, setNuevaConfig] = useState({ area_nombre: '', maquina_nombre: '' });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, descripcion: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const [triggerAnimation, setTriggerAnimation] = useState(false);
    const dataFetchedRef = useRef(false);

    const cargarMateriales = useCallback(async () => {
        try {
            const res = await apiClient.getMaterialesPorUso('operador');
            setMaterialesGlobales(res);
        } catch (error) {
            console.error("Error al cargar materiales globales", error);
        }
    }, []);

    useEffect(() => {
        cargarMateriales();
    }, [cargarMateriales]);

    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.keyCode === 27) {
                if (deleteModal.show) setDeleteModal({ show: false, id: null, descripcion: '' });
                if (modalAsignacion.open) setModalAsignacion({ open: false, area: null });
            }
        };

        if (deleteModal.show || modalAsignacion.open) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [deleteModal.show, modalAsignacion.open]);

    const fetchData = async () => {
        try {
            if (data.length === 0) setLoading(true);
            const response = await apiClient.getAllAreasMaquinas();
            setData(response);
            setTimeout(() => setTriggerAnimation(true), 100);
        } catch (error) {
            addToast('Error al cargar configuración: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAsignacion = async (area, materialesIds) => {
        setGuardandoAsignacion(true);
        try {
            await apiClient.request(`/config-areas/sync-por-area`, {
                method: 'POST',
                body: {
                    area_nombre: area.area_nombre,
                    materiales_ids: materialesIds
                }
            });
            addToast(`Materiales asignados correctamente al área ${area.area_nombre}`, 'success');
            setModalAsignacion({ open: false, area: null });
            fetchData();
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setGuardandoAsignacion(false);
        }
    };

    useEffect(() => {
        if (dataFetchedRef.current) return;
        dataFetchedRef.current = true;
        fetchData();
    }, []);

    const areasUnicas = useMemo(() => {
        const areas = data.map(item => item.area_nombre);
        return [...new Set(areas)].sort();
    }, [data]);

    const materialesPorArea = useMemo(() => {
        const areaMateriales = {};

        data.forEach(maquina => {
            if (!areaMateriales[maquina.area_nombre]) {
                areaMateriales[maquina.area_nombre] = new Set();
            }
            if (maquina.materiales_permitidos) {
                maquina.materiales_permitidos.forEach(mat => {
                    areaMateriales[maquina.area_nombre].add(mat.id);
                });
            }
        });

        Object.keys(areaMateriales).forEach(area => {
            areaMateriales[area] = Array.from(areaMateriales[area]);
        });

        return areaMateriales;
    }, [data]);

    const groupedData = useMemo(() => {
        const filtered = data.filter(item => {
            const search = searchTerm.toLowerCase();
            return item.area_nombre.toLowerCase().includes(search) ||
                item.maquina_nombre.toLowerCase().includes(search);
        });

        const groups = {};
        filtered.forEach(item => {
            if (!groups[item.area_nombre]) {
                groups[item.area_nombre] = [];
            }
            groups[item.area_nombre].push(item);
        });

        return Object.keys(groups).sort().reduce((obj, key) => {
            obj[key] = groups[key].sort((a, b) => a.orden - b.orden);
            return obj;
        }, {});
    }, [data, searchTerm]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!nuevaConfig.area_nombre.trim() || !nuevaConfig.maquina_nombre.trim()) {
            addToast('Complete ambos campos', 'warning');
            return;
        }

        setEnviando(true);
        try {
            await apiClient.createAreaMaquina(nuevaConfig);
            addToast('Máquina agregada correctamente', 'success');
            setNuevaConfig(prev => ({ ...prev, maquina_nombre: '' }));
            fetchData();
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setEnviando(false);
        }
    };

    const requestDelete = (item, e) => {
        e.stopPropagation();
        setDeleteModal({
            show: true,
            id: item.id,
            descripcion: `${item.maquina_nombre} de ${item.area_nombre}`
        });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        setIsDeleting(true);
        try {
            await apiClient.deleteAreaMaquina(deleteModal.id);
            addToast('Eliminado correctamente', 'success');
            fetchData();
            setDeleteModal({ show: false, id: null, descripcion: '' });
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
        formCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, border: `1px solid ${colors.primaryLight}`, marginBottom: spacing.xl, display: 'flex', flexDirection: 'column', gap: spacing.md, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.05)', position: 'relative', overflow: 'hidden' },
        formAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: colors.primary },
        formHeader: { fontSize: typography.sizes.sm, fontWeight: 'bold', color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: spacing.sm },
        formRow: { display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' },
        gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.lg },
        areaCard: (index) => ({
            backgroundColor: colors.surface, border: `1px solid ${colors.gray200}`, borderTop: `4px solid ${colors.primary}`, borderRadius: radius.lg, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: shadows.sm,
            opacity: triggerAnimation ? 1 : 0, transform: triggerAnimation ? 'translateY(0)' : 'translateY(15px)', transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: `${index * 0.05}s`
        }),
        areaHeader: { backgroundColor: '#F8FAFC', padding: `${spacing.sm} ${spacing.md}`, borderBottom: `1px solid ${colors.gray200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        areaTitleGroup: { display: 'flex', alignItems: 'center', gap: spacing.sm },
        areaIcon: { color: colors.gray400 },
        areaTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.gray800, textTransform: 'uppercase', letterSpacing: '0.02em' },
        machineCountBadge: { fontSize: '0.65rem', backgroundColor: colors.primary + '15', color: colors.primary, padding: '2px 8px', borderRadius: radius.full, fontWeight: '700', minWidth: '20px', textAlign: 'center' },
        machinesList: { padding: spacing.md, display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignContent: 'flex-start', flex: 1 },
        machineTag: {
            display: 'inline-flex', alignItems: 'center', gap: spacing.xs, padding: '6px 10px 6px 12px', backgroundColor: colors.surface, color: colors.gray700, borderRadius: radius.md, fontSize: '0.8rem', fontWeight: '600', border: `1px solid ${colors.gray200}`, transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', cursor: 'default'
        },
        tagActions: { display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px', borderLeft: `1px solid ${colors.gray200}`, paddingLeft: '6px' },
        deleteTagBtn: { border: 'none', background: 'none', color: colors.error, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px', ':hover': { backgroundColor: '#FEF2F2' } },
        emptyState: { gridColumn: '1 / -1', padding: spacing.xl, textAlign: 'center', color: colors.gray500, backgroundColor: colors.surface, borderRadius: radius.lg, border: `2px dashed ${colors.gray200}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md },
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 },
        alertBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '90%', maxWidth: '400px', boxShadow: shadows.xl, textAlign: 'center', border: `1px solid ${colors.gray200}`, display: 'flex', flexDirection: 'column', gap: spacing.md },
        alertTitle: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.gray900, margin: 0 },
        alertActions: { display: 'flex', gap: spacing.md, justifyContent: 'center', marginTop: spacing.sm },
        materialesResumen: {
            padding: spacing.xs,
            backgroundColor: colors.gray50,
            borderBottom: `1px solid ${colors.gray200}`,
            fontSize: typography.sizes.xs,
            color: colors.gray600,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            flexWrap: 'wrap'
        },
        configAreaBtn: {
            border: 'none',
            background: 'none',
            color: colors.primary,
            cursor: 'pointer',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: radius.sm,
            fontSize: '0.7rem',
            fontWeight: '600',
            ':hover': { backgroundColor: colors.primaryLight + '20' }
        }
    };

    if (loading) return <div style={{ ...baseComponents.card, padding: spacing.xl }}><div style={{ display: 'flex', justifyContent: 'center' }}><LoadingSpinner message="Cargando configuración..." /></div></div>;

    const deleteConfirmationModal = deleteModal.show ? createPortal(
        <div style={styles.overlay} onClick={() => !isDeleting && setDeleteModal({ ...deleteModal, show: false })}>
            <div style={styles.alertBox} onClick={e => e.stopPropagation()}>
                <div style={{ color: colors.error, display: 'flex', justifyContent: 'center' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div>
                    <h3 style={styles.alertTitle}>¿Eliminar máquina?</h3>
                    <p style={{ color: colors.gray600, margin: '8px 0' }}>Estás eliminando <strong>{deleteModal.descripcion}</strong>.</p>
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
                    <h3 style={styles.title}>Áreas y Máquinas</h3>
                    <p style={styles.subtitle}>Gestiona la estructura de planta y asigna materiales por área.</p>
                </div>
                <div style={styles.searchContainer}>
                    <SmoothInput
                        placeholder="Buscar área o máquina..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ height: '40px', backgroundColor: colors.surface }}
                        rightElement={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.gray400 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>}
                    />
                </div>
            </div>

            <form onSubmit={handleCreate} style={styles.formCard}>
                <div style={styles.formAccent}></div>
                <div style={styles.formHeader}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Alta Rápida
                </div>
                <div style={styles.formRow}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <SmoothInput
                            label="ÁREA"
                            list="areas-list"
                            value={nuevaConfig.area_nombre}
                            onChange={(e) => setNuevaConfig({ ...nuevaConfig, area_nombre: e.target.value.toUpperCase() })}
                            placeholder="Selecciona o escribe nueva..."
                            style={{ textTransform: 'uppercase' }}
                            required
                        />
                        <datalist id="areas-list">
                            {areasUnicas.map(area => <option key={area} value={area} />)}
                        </datalist>
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <SmoothInput
                            label="NOMBRE DE MÁQUINA"
                            value={nuevaConfig.maquina_nombre}
                            onChange={(e) => setNuevaConfig({ ...nuevaConfig, maquina_nombre: e.target.value.toUpperCase() })}
                            placeholder="Ej: TREF 7"
                            style={{ textTransform: 'uppercase' }}
                            required
                        />
                    </div>
                    <div style={{ minWidth: '120px' }}>
                        <SmoothButton type="submit" disabled={enviando} style={{ height: '38px', width: '100%', justifyContent: 'center' }}>
                            {enviando ? 'Guardando...' : 'Agregar'}
                        </SmoothButton>
                    </div>
                </div>
            </form>

            <div style={styles.gridContainer}>
                {Object.entries(groupedData).map(([area, maquinas], index) => (
                    <div key={area} style={styles.areaCard(index)}>
                        <div style={styles.areaHeader}>
                            <div style={styles.areaTitleGroup}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={styles.areaIcon}><path d="M3 3h7v7H3z"></path><path d="M14 3h7v7h-7z"></path><path d="M14 14h7v7h-7z"></path><path d="M3 14h7v7H3z"></path></svg>
                                <span style={styles.areaTitle}>{area}</span>
                            </div>
                            <span style={styles.machineCountBadge}>{maquinas.length}</span>
                        </div>

                        {/* Resumen de materiales del área */}
                        <div style={styles.materialesResumen}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <circle cx="12" cy="8" r="1" fill="currentColor"></circle>
                            </svg>
                            <span style={{ fontWeight: '600', marginRight: '4px' }}>Materiales:</span>
                            {materialesPorArea[area]?.length > 0 ? (
                                <span style={{ color: colors.gray700 }}>
                                    {materialesGlobales
                                        .filter(m => materialesPorArea[area].includes(m.id))
                                        .map(m => m.tipo_nombre)
                                        .join(', ')}
                                </span>
                            ) : (
                                <span style={{ color: colors.warning, fontStyle: 'italic' }}>
                                    Sin asignar
                                </span>
                            )}
                            <button
                                type="button"
                                style={styles.configAreaBtn}
                                onClick={() => setModalAsignacion({
                                    open: true,
                                    area: {
                                        area_nombre: area,
                                        materiales_ids: materialesPorArea[area] || []
                                    }
                                })}
                                title="Configurar materiales del área"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                Asignar
                            </button>
                        </div>

                        <div style={styles.machinesList}>
                            {maquinas.map(m => (
                                <div key={m.id} style={styles.machineTag}>
                                    {m.maquina_nombre}
                                    <div style={styles.tagActions}>
                                        <button
                                            type="button"
                                            onClick={(e) => requestDelete(m, e)}
                                            style={styles.deleteTagBtn}
                                            title="Eliminar máquina"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {Object.keys(groupedData).length === 0 && (
                    <div style={styles.emptyState}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.gray300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        <h4 style={{ margin: '0 0 4px 0', color: colors.gray700 }}>No se encontraron resultados</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay áreas ni máquinas {searchTerm ? 'que coincidan con tu búsqueda' : 'configuradas'}.</p>
                    </div>
                )}
            </div>

            {/* Modal de asignación por área */}
            <AsignarMaterialesModal
                isOpen={modalAsignacion.open}
                onClose={() => setModalAsignacion({ open: false, area: null })}
                area={modalAsignacion.area}
                materialesGlobales={materialesGlobales}
                onSave={handleSaveAsignacion}
                enviando={guardandoAsignacion}
            />

            {deleteConfirmationModal}
        </CardTransition>
    );
};

export default AreasMaquinasManagement;