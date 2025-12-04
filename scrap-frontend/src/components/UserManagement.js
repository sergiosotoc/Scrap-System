/* src/components/UserManagement.js */
import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';
import SmoothButton from './SmoothButton';
import SmoothInput from './SmoothInput';
import LoadingSpinner from './LoadingSpinner';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', password: '', name: '', role: '', activo: true });
    const [showPassword, setShowPassword] = useState(false);
    const initialLoadRef = useRef(true);
    const actionInProgressRef = useRef(false);

    useEffect(() => {
        const handleEscKey = (event) => { if (event.keyCode === 27 && showModal) setShowModal(false); };
        if (showModal) { document.addEventListener('keydown', handleEscKey); document.body.style.overflow = 'hidden'; }
        else { document.body.style.overflow = 'unset'; }
        return () => { document.removeEventListener('keydown', handleEscKey); document.body.style.overflow = 'unset'; };
    }, [showModal]);

    const loadUsers = async (showNotification = false) => {
        try {
            setLoading(true);
            const usersData = await apiClient.getUsers();
            setUsers(usersData);
            if (showNotification && !initialLoadRef.current) addToast(`Usuarios actualizados correctamente`, 'success');
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            if (!initialLoadRef.current) addToast('Error al cargar usuarios: ' + error.message, 'error');
        } finally {
            setLoading(false);
            initialLoadRef.current = false;
        }
    };

    useEffect(() => { loadUsers(false); }, []);

    const openCreateModal = () => { setEditingUser(null); setFormData({ username: '', password: '', name: '', role: '', activo: true }); setShowModal(true); };
    const openEditModal = (user) => { setEditingUser(user); setFormData({ username: user.username, password: '', name: user.name, role: user.role, activo: user.activo }); setShowModal(true); };
    const handleInputChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };

    const handleSubmit = async (e) => {
        e.preventDefault(); if (actionInProgressRef.current) return; actionInProgressRef.current = true;
        try {
            const submitData = { ...formData };
            if (editingUser && !submitData.password) delete submitData.password;
            if (editingUser) { await apiClient.updateUser(editingUser.id, submitData); addToast(`Usuario "${formData.name}" actualizado exitosamente`, 'success'); }
            else { await apiClient.createUser(submitData); addToast(`Usuario "${formData.name}" creado exitosamente`, 'success'); }
            setShowModal(false); loadUsers(true);
        } catch (error) {
            const errorMessage = error.message || '';
            if (errorMessage.includes('usuario ya está en uso')) addToast('El nombre de usuario ya está en uso.', 'warning');
            else addToast('Error al guardar usuario: ' + errorMessage, 'error');
        } finally { actionInProgressRef.current = false; }
    };

    const handleToggleStatus = async (user) => {
        if (actionInProgressRef.current) return; actionInProgressRef.current = true;
        if (user.id === currentUser?.id) { addToast('No puedes desactivar tu propio usuario', 'warning'); actionInProgressRef.current = false; return; }
        if (!window.confirm(`¿${user.activo ? 'Desactivar' : 'Activar'} a ${user.name}?`)) { actionInProgressRef.current = false; return; }
        try { await apiClient.toggleUserStatus(user.id); addToast(`Usuario ${user.activo ? 'desactivado' : 'activado'} exitosamente`, 'success'); loadUsers(true); }
        catch (error) { addToast('Error al cambiar estado', 'error'); } finally { actionInProgressRef.current = false; }
    };

    const handleDelete = async (user) => {
        if (actionInProgressRef.current) return; actionInProgressRef.current = true;
        if (!window.confirm(`¿Eliminar a ${user.name}? Esta acción es irreversible.`)) { actionInProgressRef.current = false; return; }
        try { await apiClient.deleteUser(user.id); addToast(`Usuario eliminado`, 'success'); loadUsers(true); }
        catch (error) { addToast('Error al eliminar: ' + error.message, 'error'); } finally { actionInProgressRef.current = false; }
    };

    const getRoleLabel = (role) => { const roles = { admin: 'Administrador', operador: 'Operador Logística', receptor: 'Receptor Scrap' }; return roles[role] || role; };

    const styles = {
        container: { ...baseComponents.card, padding: spacing.lg, position: 'relative', border: `1px solid ${colors.gray200}` },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottom: `1px solid ${colors.gray200}` },
        title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: colors.gray900, margin: 0 },
        
        // Eliminamos baseComponents.buttonPrimary aquí porque SmoothButton ya lo aplica
        createButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: `${spacing.sm} ${spacing.md}`, height: '40px' },
        
        loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: spacing.xl, flexDirection: 'column', gap: spacing.md },
        tableContainer: { overflowX: 'auto', borderRadius: radius.md, border: `1px solid ${colors.gray200}` },
        table: { width: '100%', borderCollapse: 'collapse', backgroundColor: colors.surface },
        th: { padding: spacing.md, textAlign: 'left', fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.gray600, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: colors.gray50, borderBottom: `1px solid ${colors.gray200}` },
        tr: { borderBottom: `1px solid ${colors.gray200}`, transition: 'background-color 0.2s ease' },
        td: { padding: spacing.md, verticalAlign: 'middle', fontSize: typography.sizes.sm, color: colors.gray700 },
        status: { ...baseComponents.badge, minWidth: '70px', justifyContent: 'center', fontWeight: '600' },
        active: { backgroundColor: colors.secondaryLight, color: colors.secondaryHover },
        inactive: { backgroundColor: '#FEF2F2', color: colors.error },
        actions: { display: 'flex', gap: spacing.xs, flexWrap: 'wrap' },
        actionBtnBase: { padding: `4px ${spacing.sm}`, fontSize: typography.sizes.xs, height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, border: 'none', fontWeight: '500' },
        editBtn: { backgroundColor: colors.gray100, color: colors.gray700 },
        deleteBtn: { backgroundColor: '#FEE2E2', color: colors.error },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: spacing.md, backdropFilter: 'blur(2px)' },
        modal: { ...baseComponents.card, padding: spacing.lg, width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: shadows.xl },
        modalTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.gray900, margin: `0 0 ${spacing.md} 0` },
        form: { display: 'flex', flexDirection: 'column', gap: spacing.md },
        formGroup: { display: 'flex', flexDirection: 'column', gap: spacing.xs },
        label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.gray700 },
        
        // Eliminamos baseComponents.input aquí porque SmoothInput ya lo aplica
        input: { height: '42px' }, 
        
        select: { ...baseComponents.select, height: '42px' },
        modalActions: { display: 'flex', gap: spacing.md, marginTop: spacing.md },
        
        submitButton: { flex: 1, height: '42px' },
        cancelButton: { flex: 1, height: '42px' },
        
        roleBadge: { ...baseComponents.badge, backgroundColor: colors.primary + '15', color: colors.primary, textTransform: 'capitalize' }
    };

    if (loading) return <div style={styles.container}><div style={styles.loadingContainer}><LoadingSpinner message="Cargando usuarios..." /></div></div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Gestión de Usuarios</h2>
                <SmoothButton onClick={openCreateModal} style={styles.createButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Nuevo Usuario
                </SmoothButton>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Usuario</th><th style={styles.th}>Nombre</th><th style={styles.th}>Rol</th><th style={styles.th}>Estado</th><th style={styles.th}>Acciones</th></tr></thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={styles.tr} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.gray50} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <td style={styles.td}><strong>{user.username}</strong></td>
                                <td style={styles.td}>{user.name}</td>
                                <td style={styles.td}><span style={styles.roleBadge}>{getRoleLabel(user.role)}</span></td>
                                <td style={styles.td}><span style={{ ...styles.status, ...(user.activo ? styles.active : styles.inactive) }}>{user.activo ? 'Activo' : 'Inactivo'}</span></td>
                                <td style={styles.td}>
                                    <div style={styles.actions}>
                                        <SmoothButton onClick={() => openEditModal(user)} style={{...styles.actionBtnBase, ...styles.editBtn}} title="Editar usuario">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </SmoothButton>
                                        <SmoothButton onClick={() => handleToggleStatus(user)} disabled={user.id === currentUser?.id || actionInProgressRef.current} style={{ ...styles.actionBtnBase, backgroundColor: user.activo ? '#FEF2F2' : '#ECFDF5', color: user.activo ? colors.error : colors.secondary }} title={user.activo ? "Desactivar usuario" : "Activar usuario"}>
                                            {user.activo ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            )}
                                        </SmoothButton>
                                        <SmoothButton onClick={() => handleDelete(user)} disabled={user.id === currentUser?.id || actionInProgressRef.current} style={{...styles.actionBtnBase, ...styles.deleteBtn}} title="Eliminar usuario">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </SmoothButton>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.gray500 }}>No hay usuarios registrados en el sistema.</div>}
            </div>

            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.formGroup}><label style={styles.label}>Nombre completo</label><SmoothInput type="text" name="name" value={formData.name} onChange={handleInputChange} style={styles.input} required placeholder="Ej. Juan Pérez" /></div>
                            <div style={styles.formGroup}><label style={styles.label}>Usuario</label><SmoothInput type="text" name="username" value={formData.username} onChange={handleInputChange} style={styles.input} required placeholder="Ej. jperez" /></div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>{editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
                                <SmoothInput type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} style={{...styles.input, paddingRight: '40px'}} required={!editingUser} minLength="6" rightElement={
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.gray500, display: 'flex', alignItems: 'center' }}>
                                        {showPassword ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                                    </button>
                                } />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Rol</label>
                                <select name="role" value={formData.role} onChange={handleInputChange} style={styles.select} required>
                                    <option value="">Seleccionar rol...</option>
                                    <option value="operador">Operador de Logística</option>
                                    <option value="receptor">Receptor de Scrap</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div style={styles.modalActions}>
                                <SmoothButton type="button" onClick={() => setShowModal(false)} variant="secondary" style={styles.cancelButton} disabled={actionInProgressRef.current}>Cancelar</SmoothButton>
                                <SmoothButton onClick={handleSubmit} style={{ ...styles.submitButton, backgroundColor: actionInProgressRef.current ? colors.gray400 : colors.primary }} disabled={actionInProgressRef.current}>{actionInProgressRef.current ? 'Guardando...' : 'Guardar Usuario'}</SmoothButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;