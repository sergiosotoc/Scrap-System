/* src/components/UserNabagement.js */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, radius, spacing, typography, baseComponents, shadows } from '../styles/designSystem';
import SmoothButton from './SmoothButton';
import SmoothInput from './SmoothInput';
import SmoothSelect from './SmoothSelect';
import LoadingSpinner from './LoadingSpinner';
import CardTransition from './CardTransition'; 

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [showModal, setShowModal] = useState(false); 
    const [deleteModal, setDeleteModal] = useState({ show: false, user: null });
    
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', password: '', name: '', role: '' });
    const [showPassword, setShowPassword] = useState(false);
    
    const initialLoadRef = useRef(true);
    const actionInProgressRef = useRef(false);
    const dataFetchedRef = useRef(false);

    const [triggerAnimation, setTriggerAnimation] = useState(false);

    // Bloqueo de scroll al abrir modales
    useEffect(() => {
        const handleEscKey = (event) => { 
            if (event.keyCode === 27) {
                if (showModal) setShowModal(false);
                if (deleteModal.show) setDeleteModal({ show: false, user: null });
            }
        };
        
        if (showModal || deleteModal.show) { 
            document.addEventListener('keydown', handleEscKey); 
            document.body.style.overflow = 'hidden'; 
        } else { 
            document.body.style.overflow = 'unset'; 
        }
        
        return () => { 
            document.removeEventListener('keydown', handleEscKey); 
            document.body.style.overflow = 'unset'; 
        };
    }, [showModal, deleteModal.show]);

    const loadUsers = async (showNotification = false) => {
        try {
            if (users.length === 0) setLoading(true);
            
            const usersData = await apiClient.getUsers();
            setUsers(usersData);
            
            setTimeout(() => setTriggerAnimation(true), 100);

            if (showNotification && !initialLoadRef.current) addToast(`Usuarios actualizados`, 'success');
        } catch (error) {
            if (!initialLoadRef.current) addToast('Error al cargar usuarios', 'error');
        } finally {
            setLoading(false);
            initialLoadRef.current = false;
        }
    };

    useEffect(() => { 
        if (dataFetchedRef.current) return;
        dataFetchedRef.current = true;
        loadUsers(false); 
    }, []);

    // CONFIGURACIÓN DE ROLES (Colores y Etiquetas)
    const roleConfig = {
        admin: { label: 'Administradores', color: colors.primary },     // Azul
        operador: { label: 'Operadores Logística', color: colors.secondary }, // Verde
        receptor: { label: 'Receptores Scrap', color: colors.warning }   // Naranja
    };

    // AGRUPACIÓN DINÁMICA
    const groupedUsers = useMemo(() => {
        const filtered = users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const groups = {
            admin: [],
            operador: [],
            receptor: []
        };

        filtered.forEach(user => {
            if (groups[user.role]) {
                groups[user.role].push(user);
            }
        });

        return groups;
    }, [users, searchTerm]);

    const openCreateModal = () => { setEditingUser(null); setFormData({ username: '', password: '', name: '', role: '' }); setShowModal(true); };
    const openEditModal = (user) => { setEditingUser(user); setFormData({ username: user.username, password: '', name: user.name, role: user.role }); setShowModal(true); };
    const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

    const handleSubmit = async (e) => {
        e.preventDefault(); if (actionInProgressRef.current) return; actionInProgressRef.current = true;
        try {
            const submitData = { ...formData };
            if (editingUser && !submitData.password) delete submitData.password;
            if (editingUser) { await apiClient.updateUser(editingUser.id, submitData); addToast(`Usuario actualizado`, 'success'); }
            else { await apiClient.createUser(submitData); addToast(`Usuario creado`, 'success'); }
            setShowModal(false); loadUsers(true);
        } catch (error) {
            addToast('Error al guardar: ' + error.message, 'error');
        } finally { actionInProgressRef.current = false; }
    };

    const requestDelete = (user) => {
        if (user.id === currentUser?.id) { 
            addToast('No puedes eliminar tu propio usuario', 'warning'); 
            return; 
        }
        setDeleteModal({ show: true, user });
    };

    const confirmDelete = async () => {
        if (!deleteModal.user || actionInProgressRef.current) return;
        
        actionInProgressRef.current = true;
        try { 
            await apiClient.deleteUser(deleteModal.user.id); 
            addToast(`Usuario eliminado`, 'success'); 
            loadUsers(true); 
            setDeleteModal({ show: false, user: null });
        } catch (error) { 
            addToast('Error al eliminar', 'error'); 
        } finally { 
            actionInProgressRef.current = false; 
        }
    };

    const styles = {
        container: { ...baseComponents.card, padding: spacing.lg, position: 'relative', border: `1px solid ${colors.gray200}`, minHeight: '600px' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottom: `1px solid ${colors.gray200}`, flexWrap: 'wrap', gap: spacing.md },
        title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: colors.gray900, margin: 0 },
        
        // Ajuste para el botón: evitar que se estire demasiado
        createButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: `0 ${spacing.lg}`, height: '40px', whiteSpace: 'nowrap' },
        
        loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: spacing.xl, flexDirection: 'column', gap: spacing.md },
        
        // Ajuste para el contenedor de búsqueda: ancho fijo para que se vea bien al lado del botón
        searchContainer: { width: '250px' },

        // Grid Styles
        gridContainer: { 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: spacing.lg 
        },
        roleCard: (index, roleColor) => ({
            backgroundColor: colors.surface,
            border: `1px solid ${colors.gray200}`,
            borderTop: `4px solid ${roleColor}`,
            borderRadius: radius.md,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: shadows.sm,
            opacity: triggerAnimation ? 1 : 0,
            transform: triggerAnimation ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.3s ease',
            transitionDelay: `${index * 0.05}s`
        }),
        roleHeader: {
            backgroundColor: colors.gray50,
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${colors.gray200}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        roleTitle: {
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.bold,
            color: colors.gray800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        },
        userCount: {
            fontSize: '0.7rem',
            backgroundColor: colors.gray200,
            color: colors.gray700,
            padding: '2px 8px',
            borderRadius: radius.full,
            fontWeight: 'bold'
        },
        userList: {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '400px',
            overflowY: 'auto'
        },
        userItem: {
            display: 'flex',
            alignItems: 'center',
            padding: spacing.md,
            borderBottom: `1px solid ${colors.gray100}`,
            gap: spacing.md,
            transition: 'background-color 0.2s',
            ':hover': {
                backgroundColor: colors.gray50
            }
        },
        userAvatar: (roleColor) => ({
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: roleColor + '20', // Opacidad 20%
            color: roleColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.1rem'
        }),
        userInfo: {
            flex: 1,
            minWidth: 0
        },
        userName: {
            fontSize: typography.sizes.sm,
            fontWeight: '600',
            color: colors.gray900,
            marginBottom: '2px'
        },
        userUsername: {
            fontSize: '0.75rem',
            color: colors.gray500
        },
        actions: { display: 'flex', gap: spacing.xs },
        actionBtnBase: { padding: `4px`, fontSize: typography.sizes.xs, height: '28px', width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, border: 'none', fontWeight: '500', cursor: 'pointer' },
        editBtn: { backgroundColor: colors.gray100, color: colors.gray600, ':hover': { backgroundColor: colors.gray200, color: colors.primary } },
        deleteBtn: { backgroundColor: 'transparent', color: colors.error, opacity: 0.7, ':hover': { backgroundColor: colors.error + '15', opacity: 1 } },
        
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, animation: 'fadeIn 0.2s ease-out' },
        modal: { backgroundColor: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.gray200}`, width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: shadows.xl, position: 'relative', overflow: 'hidden', animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' },
        modalHeader: { padding: `${spacing.md} ${spacing.lg}`, borderBottom: `1px solid ${colors.gray200}`, backgroundColor: colors.surface, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
        modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.gray900, margin: 0 },
        modalContent: { padding: spacing.lg, overflowY: 'auto', flex: '1 1 auto', minHeight: 0 },
        form: { display: 'flex', flexDirection: 'column', gap: spacing.md },
        formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
        modalActions: { padding: `${spacing.md} ${spacing.lg}`, borderTop: `1px solid ${colors.gray200}`, backgroundColor: colors.gray50, display: 'flex', gap: spacing.md, flex: '0 0 auto', zIndex: 2 },
        submitButton: { flex: 1, height: '40px' },
        cancelButton: { flex: 1, height: '40px' },
        roleBadge: { ...baseComponents.badge, backgroundColor: colors.primary + '15', color: colors.primary, textTransform: 'capitalize' },
        alertBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center', border: `1px solid ${colors.gray200}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md },
        alertIconCircle: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
        alertTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.gray900, margin: 0 },
        alertText: { fontSize: typography.sizes.base, color: colors.gray600, margin: 0, lineHeight: 1.6 },
        alertHighlight: { color: colors.gray900, fontWeight: typography.weights.bold },
        alertActions: { display: 'flex', gap: spacing.md, justifyContent: 'center', width: '100%', marginTop: spacing.sm },

        emptyState: { 
            gridColumn: '1 / -1', 
            padding: spacing.xl, 
            textAlign: 'center', 
            color: colors.gray500,
            backgroundColor: colors.gray50,
            borderRadius: radius.md,
            border: `1px dashed ${colors.gray300}`
        },
    };

    if (loading) return <div style={{...baseComponents.card, padding: spacing.xl, border: `1px solid ${colors.gray200}`}}><div style={styles.loadingContainer}><LoadingSpinner message="Cargando usuarios..." /></div></div>;

    const userModal = showModal ? (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.gray500 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div style={styles.modalContent}>
                    <form id="userForm" onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.formGroup}><SmoothInput label="Nombre completo" type="text" name="name" value={formData.name} onChange={handleInputChange} style={styles.input} required placeholder="Ej. Juan Pérez" /></div>
                        <div style={styles.formGroup}><SmoothInput label="Usuario" type="text" name="username" value={formData.username} onChange={handleInputChange} style={styles.input} required placeholder="Ej. jperez" /></div>
                        <div style={styles.formGroup}>
                            <SmoothInput 
                                label={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'} 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                value={formData.password} 
                                onChange={handleInputChange} 
                                style={{paddingRight: '40px'}} 
                                required={!editingUser} 
                                minLength="6" 
                                rightElement={
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.gray500, display: 'flex', alignItems: 'center' }}
                                    >
                                        {showPassword ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        ) : (
                                            // ✅ ÍCONO CORREGIDO: Sintaxis válida para <path d="...">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        )}
                                    </button>
                                } 
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <SmoothSelect label="Rol" name="role" value={formData.role} onChange={handleInputChange} required>
                                <option value="">Seleccionar rol...</option>
                                <option value="operador">Operador de Logística</option>
                                <option value="receptor">Receptor de Scrap</option>
                                <option value="admin">Administrador</option>
                            </SmoothSelect>
                        </div>
                    </form>
                </div>
                <div style={styles.modalActions}>
                    <SmoothButton type="button" onClick={() => setShowModal(false)} variant="secondary" style={styles.cancelButton} disabled={actionInProgressRef.current}>Cancelar</SmoothButton>
                    <SmoothButton onClick={handleSubmit} style={{ ...styles.submitButton, backgroundColor: actionInProgressRef.current ? colors.gray400 : colors.primary }} disabled={actionInProgressRef.current}>{actionInProgressRef.current ? 'Guardando...' : 'Guardar Usuario'}</SmoothButton>
                </div>
            </div>
        </div>
    ) : null;

    const deleteConfirmationModal = deleteModal.show ? (
        <div style={styles.modalOverlay} onClick={() => !actionInProgressRef.current && setDeleteModal({ show: false, user: null })}>
            <div style={styles.alertBox} onClick={e => e.stopPropagation()}>
                <div style={styles.alertIconCircle}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
                <div>
                    <h3 style={styles.alertTitle}>¿Eliminar usuario?</h3>
                    <p style={styles.alertText}>Estás a punto de eliminar a <span style={styles.alertHighlight}>"{deleteModal.user?.name}"</span>.<br /><span style={{fontSize: '0.9em', color: colors.error}}>Esta acción es irreversible.</span></p>
                </div>
                <div style={styles.alertActions}>
                    <SmoothButton variant="secondary" onClick={() => setDeleteModal({ show: false, user: null })} disabled={actionInProgressRef.current} style={{ flex: 1, justifyContent: 'center', height: '44px' }}>Cancelar</SmoothButton>
                    <SmoothButton variant="destructive" onClick={confirmDelete} disabled={actionInProgressRef.current} style={{ flex: 1, justifyContent: 'center', height: '44px', backgroundColor: '#DC2626' }}>{actionInProgressRef.current ? 'Eliminando...' : 'Sí, Eliminar'}</SmoothButton>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <CardTransition delay={0} style={styles.container}>
            <style>{`@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            
            <div style={styles.header}>
                <h2 style={styles.title}>Gestión de Usuarios</h2>
                <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
                    <div style={styles.searchContainer}>
                        <SmoothInput 
                            placeholder="Buscar usuario..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{height: '40px'}}
                            rightElement={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: colors.gray400}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>}
                        />
                    </div>
                    <SmoothButton onClick={openCreateModal} style={styles.createButton}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Nuevo
                    </SmoothButton>
                </div>
            </div>

            <div style={styles.gridContainer}>
                {['admin', 'operador', 'receptor'].map((roleKey, index) => {
                    const groupUsers = groupedUsers[roleKey] || [];
                    if (groupUsers.length === 0 && searchTerm) return null; 
                    
                    return (
                        <div key={roleKey} style={styles.roleCard(index, roleConfig[roleKey].color)}>
                            <div style={styles.roleHeader}>
                                <span style={styles.roleTitle}>{roleConfig[roleKey].label}</span>
                                <span style={styles.userCount}>{groupUsers.length}</span>
                            </div>
                            <div style={styles.userList}>
                                {groupUsers.map(user => (
                                    <div key={user.id} style={styles.userItem}>
                                        <div style={styles.userAvatar(roleConfig[roleKey].color)}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={styles.userInfo}>
                                            <div style={styles.userName}>{user.name}</div>
                                            <div style={styles.userUsername}>@{user.username}</div>
                                        </div>
                                        <div style={styles.actions}>
                                            <button 
                                                onClick={() => openEditModal(user)} 
                                                style={{...styles.actionBtnBase, ...styles.editBtn}} 
                                                title="Editar usuario"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button 
                                                onClick={() => requestDelete(user)} 
                                                disabled={user.id === currentUser?.id}
                                                style={{
                                                    ...styles.actionBtnBase, 
                                                    ...styles.deleteBtn,
                                                    opacity: user.id === currentUser?.id ? 0.5 : 1,
                                                    cursor: user.id === currentUser?.id ? 'not-allowed' : 'pointer'
                                                }} 
                                                title="Eliminar usuario"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {groupUsers.length === 0 && (
                                    <div style={{padding: spacing.lg, textAlign: 'center', color: colors.gray400, fontSize: typography.sizes.sm, fontStyle: 'italic'}}>
                                        No hay usuarios registrados
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {Object.values(groupedUsers).every(g => g.length === 0) && (
                    <div style={styles.emptyState}>
                        <div style={{marginBottom: '10px'}}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.gray300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </div>
                        <p>No se encontraron usuarios{searchTerm ? ' con esa búsqueda' : ''}.</p>
                    </div>
                )}
            </div>

            {showModal && createPortal(userModal, document.body)}
            {deleteModal.show && createPortal(deleteConfirmationModal, document.body)}
        </CardTransition>
    );
};

export default UserManagement;