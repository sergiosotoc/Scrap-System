/* src/components/CorreosManagment.js */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import SmoothButton from './SmoothButton';
import SmoothInput from './SmoothInput';
import CardTransition from './CardTransition';
import LoadingSpinner from './LoadingSpinner';
import { colors, spacing, radius, shadows, typography } from '../styles/designSystem';

const CorreosManagement = () => {
    const { addToast } = useToast();
    const [correos, setCorreos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nuevo, setNuevo] = useState({ nombre: '', email: '' });
    const [guardando, setGuardando] = useState(false);

    // Estado para la alerta personalizada
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        cargarCorreos();
    }, []);

    const cargarCorreos = async () => {
        try {
            const data = await apiClient.getDestinatarios();
            setCorreos(data);
        } catch (error) {
            addToast('Error cargando la lista de correos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!nuevo.nombre.trim() || !nuevo.email.trim()) {
            addToast('Todos los campos son obligatorios', 'warning');
            return;
        }
        
        setGuardando(true);
        try {
            await apiClient.createDestinatario(nuevo);
            addToast('Destinatario agregado correctamente', 'success');
            setNuevo({ nombre: '', email: '' });
            cargarCorreos();
        } catch (error) {
            addToast(error.message || 'Error al guardar destinatario', 'error');
        } finally {
            setGuardando(false);
        }
    };

    // Abre el modal en lugar de window.confirm
    const handleEliminarClick = (id, nombre) => {
        setItemToDelete({ id, nombre });
        setShowDeleteAlert(true);
    };

    // Ejecuta la eliminación real
    const confirmEliminar = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await apiClient.deleteDestinatario(itemToDelete.id);
            addToast('Destinatario eliminado', 'success');
            setCorreos(prev => prev.filter(c => c.id !== itemToDelete.id));
            setShowDeleteAlert(false);
            setItemToDelete(null);
        } catch (error) {
            addToast('Error al eliminar', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const styles = {
        container: {
            padding: spacing.md,
            maxWidth: '1200px',
            margin: '0 auto'
        },
        formCard: {
            backgroundColor: colors.surface,
            padding: spacing.lg,
            borderRadius: radius.lg,
            border: `1px solid ${colors.gray200}`,
            boxShadow: shadows.sm,
            marginBottom: spacing.xl,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md
        },
        formHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xs,
            color: colors.primary,
            fontWeight: typography.weights.bold,
            fontSize: typography.sizes.lg
        },
        formRow: {
            display: 'flex',
            gap: spacing.md,
            alignItems: 'flex-end', // Alinea los elementos al fondo (inputs y botón)
            flexWrap: 'wrap'
        },
        inputGroup: {
            flex: 1,
            minWidth: '280px'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: spacing.lg
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            border: `1px solid ${colors.gray200}`,
            boxShadow: shadows.sm,
            padding: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            ':hover': {
                transform: 'translateY(-4px)',
                boxShadow: shadows.md,
                borderColor: colors.primaryLight
            }
        },
        avatar: {
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            flexShrink: 0
        },
        cardInfo: {
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
        },
        name: {
            fontSize: typography.sizes.base,
            fontWeight: typography.weights.bold,
            color: colors.gray800,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        },
        email: {
            fontSize: typography.sizes.sm,
            color: colors.gray500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        },
        deleteBtn: {
            backgroundColor: 'transparent',
            border: 'none',
            color: colors.gray400,
            cursor: 'pointer',
            padding: spacing.xs,
            borderRadius: radius.md,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            ':hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: colors.error
            }
        },
        empty: {
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: spacing.xl,
            color: colors.gray500,
            backgroundColor: colors.gray50,
            borderRadius: radius.lg,
            border: `2px dashed ${colors.gray300}`
        },
        // Estilos del Modal de Confirmación
        modalOverlay: {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
        },
        modalCard: {
            backgroundColor: colors.surface,
            padding: spacing.xl,
            borderRadius: radius.lg,
            boxShadow: shadows.xl,
            maxWidth: '400px',
            width: '90%',
            animation: 'scaleIn 0.2s ease-out',
            border: `1px solid ${colors.gray200}`,
            textAlign: 'center'
        },
        modalIcon: {
            color: colors.error,
            marginBottom: spacing.md,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto ' + spacing.md
        },
        modalTitle: {
            fontSize: typography.sizes.xl,
            fontWeight: 'bold',
            color: colors.gray900,
            marginBottom: spacing.sm
        },
        modalText: {
            color: colors.gray600,
            marginBottom: spacing.xl,
            lineHeight: 1.5
        },
        modalActions: {
            display: 'flex',
            justifyContent: 'center',
            gap: spacing.md
        }
    };

    if (loading) return <LoadingSpinner message="Cargando directorio..." />;

    // Renderizado del Modal mediante Portal para asegurar que quede encima de todo
    const deleteAlertModal = showDeleteAlert && createPortal(
        <div style={styles.modalOverlay} onClick={() => !isDeleting && setShowDeleteAlert(false)}>
            <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
                <div style={styles.modalIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </div>
                <h3 style={styles.modalTitle}>¿Estás seguro?</h3>
                <p style={styles.modalText}>
                    Vas a eliminar a <strong>{itemToDelete?.nombre}</strong> de la lista de reportes. Esta acción no se puede deshacer.
                </p>
                <div style={styles.modalActions}>
                    <SmoothButton 
                        onClick={() => setShowDeleteAlert(false)} 
                        variant="secondary"
                        disabled={isDeleting}
                    >
                        Cancelar
                    </SmoothButton>
                    <SmoothButton 
                        onClick={confirmEliminar} 
                        style={{
                            backgroundColor: colors.error, 
                            color: 'white',
                            border: `1px solid ${colors.error}`
                        }}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                    </SmoothButton>
                </div>
            </div>
            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );

    return (
        <div style={styles.container}>
            {/* Formulario para agregar */}
            <CardTransition delay={0}>
                <div style={styles.formCard}>
                    <div style={styles.formHeader}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        Nuevo Destinatario
                    </div>
                    <form onSubmit={handleGuardar} style={styles.formRow}>
                        <div style={styles.inputGroup}>
                            <SmoothInput 
                                label="Nombre Completo" 
                                placeholder="Ej. Juan Pérez"
                                value={nuevo.nombre} 
                                onChange={e => setNuevo({...nuevo, nombre: e.target.value})} 
                                required 
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <SmoothInput 
                                label="Correo Electrónico" 
                                type="email" 
                                placeholder="usuario@coficab.com"
                                value={nuevo.email} 
                                onChange={e => setNuevo({...nuevo, email: e.target.value})} 
                                required 
                            />
                        </div>
                        <SmoothButton 
                            type="submit" 
                            disabled={guardando}
                            style={{
                                height: '42px', // Altura estándar para inputs grandes
                                padding: '0 24px', 
                                backgroundColor: colors.primary,
                                color: 'white',
                                marginBottom: '0px' // Eliminado el margen inferior para alinear perfectamente
                            }}
                        >
                            {guardando ? (
                                <>
                                    <span style={{animation: 'spin 1s linear infinite', marginRight: '8px', display:'inline-block'}}>↻</span>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <span style={{marginRight: '8px', fontWeight: 'bold'}}>+</span> Agregar
                                </>
                            )}
                        </SmoothButton>
                    </form>
                </div>
            </CardTransition>

            {/* Grid de Destinatarios */}
            <div style={styles.grid}>
                {correos.length > 0 ? (
                    correos.map((c, index) => (
                        <CardTransition key={c.id} delay={Math.min(index * 50, 500)}>
                            <div 
                                style={styles.card}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = shadows.md;
                                    e.currentTarget.style.borderColor = colors.primaryLight;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = shadows.sm;
                                    e.currentTarget.style.borderColor = colors.gray200;
                                }}
                            >
                                <div style={styles.avatar}>
                                    {c.nombre.charAt(0).toUpperCase()}
                                </div>
                                <div style={styles.cardInfo}>
                                    <div style={styles.name} title={c.nombre}>{c.nombre}</div>
                                    <div style={styles.email} title={c.email}>{c.email}</div>
                                </div>
                                <button 
                                    onClick={() => handleEliminarClick(c.id, c.nombre)} 
                                    style={styles.deleteBtn}
                                    title="Eliminar de la lista"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                        e.currentTarget.style.color = colors.error;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = colors.gray400;
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </CardTransition>
                    ))
                ) : (
                    <div style={styles.empty}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.gray300} strokeWidth="1" style={{ marginBottom: spacing.md }}>
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        <p style={{ margin: 0, fontWeight: 500 }}>No hay destinatarios registrados.</p>
                        <p style={{ fontSize: '0.9rem' }}>Agrega correos para habilitar el envío de reportes.</p>
                    </div>
                )}
            </div>
            
            {deleteAlertModal}
        </div>
    );
};

export default CorreosManagement;