/* src/components/routes/UserManagment.js */
import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: '',
    activo: true
  });
  const [showPassword, setShowPassword] = useState(false);

  // Usar useRef para evitar notificaciones duplicadas
  const initialLoadRef = useRef(true);
  const actionInProgressRef = useRef(false);

  // Effect para manejar la tecla ESC
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.keyCode === 27 && showModal) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  // Cargar usuarios SIN notificación inicial
  const loadUsers = async (showNotification = false) => {
    try {
      setLoading(true);
      console.log('🔄 Cargando Usuarios...');
      const usersData = await apiClient.getUsers();
      console.log('✅ Usuarios cargados: ', usersData);
      setUsers(usersData);

      // Solo mostrar notificación si se solicita explícitamente (para acciones)
      if (showNotification && !initialLoadRef.current) {
        addToast(`Usuarios actualizados correctamente`, 'success');
      }
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      // Solo mostrar error si no es la carga inicial
      if (!initialLoadRef.current) {
        addToast('Error al cargar usuarios: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
      initialLoadRef.current = false;
    }
  };

  useEffect(() => {
    loadUsers(false); // Carga inicial sin notificación
  }, []);

  // Abrir modal para crear usuario
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: '',
      activo: true
    });
    setShowModal(true);
  };

  // Abrir modal para editar usuario
  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // No mostrar password actual
      name: user.name,
      role: user.role,
      activo: user.activo
    });
    setShowModal(true);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Enviar formulario (crear o actualizar) con notificaciones
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (actionInProgressRef.current) return;
    actionInProgressRef.current = true;

    try {
      const submitData = { ...formData };

      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      if (editingUser) {
        await apiClient.updateUser(editingUser.id, submitData);
        addToast(`Usuario "${formData.name}" actualizado exitosamente`, 'success');
      } else {
        await apiClient.createUser(submitData);
        addToast(`Usuario "${formData.name}" creado exitosamente`, 'success');
      }

      setShowModal(false);
      loadUsers(true);
    } catch (error) {
      // Manejar errores específicos
      const errorMessage = error.message || '';

      if (errorMessage.includes('El nombre de usuario ya está en uso')) {
        addToast('El nombre de usuario ya está en uso. Por favor elige otro.', 'warning');
      } else if (errorMessage.includes('No puedes cambiar tu propio rol')) {
        addToast('No puedes cambiar tu propio rol', 'warning');
      } else if (errorMessage.includes('No puedes eliminar tu propio usuario')) {
        addToast('No puedes eliminar tu propio usuario', 'warning');
      } else if (errorMessage.includes('No puedes desactivar tu propio usuario')) {
        addToast('No puedes desactivar tu propio usuario', 'warning');
      } else if (errorMessage.includes('Error de validación')) {
        addToast(errorMessage, 'error');
      } else {
        addToast('Error al guardar usuario: ' + errorMessage, 'error');
      }
    } finally {
      actionInProgressRef.current = false;
    }
  };

  // Cambiar estado activo/inactivo con notificaciones
  const handleToggleStatus = async (user) => {
    if (actionInProgressRef.current) return;
    actionInProgressRef.current = true;

    if (user.id === currentUser?.id) {
      addToast('No puedes desactivar tu propio usuario', 'warning');
      actionInProgressRef.current = false;
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres ${user.activo ? 'desactivar' : 'activar'} a ${user.name}?`)) {
      actionInProgressRef.current = false;
      return;
    }

    try {
      await apiClient.toggleUserStatus(user.id);
      addToast(`Usuario ${user.activo ? 'desactivado' : 'activado'} exitosamente`, 'success');
      loadUsers(true); // Recargar con notificación
    } catch (error) {
      addToast('Error al cambiar estado: ' + error.message, 'error');
      actionInProgressRef.current = false;
    }
  };

  // Eliminar usuario con notificaciones
  const handleDelete = async (user) => {
    if (actionInProgressRef.current) return;
    actionInProgressRef.current = true;

    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${user.name}? Esta acción no se puede deshacer.`)) {
      actionInProgressRef.current = false;
      return;
    }

    try {
      await apiClient.deleteUser(user.id);
      addToast(`Usuario "${user.name}" eliminado exitosamente`, 'success');
      loadUsers(true); // Recargar con notificación
    } catch (error) {
      addToast('Error al eliminar usuario: ' + error.message, 'error');
      actionInProgressRef.current = false;
    }
  };

  // Traducir roles a español
  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Administrador',
      operador: 'Operador de Logística',
      receptor: 'Receptor de Scrap'
    };
    return roles[role] || role;
  };


  // ==========================================
  // ESTILOS ACTUALIZADOS CON ANIMACIÓN DE CARGA
  // ==========================================
  const styles = {
    container: {
      ...baseComponents.card,
      padding: spacing.lg,
      position: 'relative'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
      paddingBottom: spacing.md,
      borderBottom: `1px solid ${colors.gray200}`
    },
    title: {
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.bold,
      color: colors.gray900,
      margin: 0
    },
    // BOTÓN CREAR USUARIO CON TEXTO CENTRADO
    createButton: {
      ...baseComponents.buttonPrimary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: `${spacing.sm} ${spacing.md}`,
      height: '40px'
    },
    // ANIMACIÓN DE CARGA CIRCULAR
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      flexDirection: 'column',
      gap: spacing.md
    },
    loadingSpinner: {
      width: '60px',
      height: '60px',
      border: `3px solid ${colors.primaryLight}`,
      borderTop: `3px solid ${colors.primary}`,
      borderRight: `3px solid ${colors.secondary}`,
      borderBottom: `3px solid ${colors.secondary}`,
      borderRadius: '50%',
      animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
    },
    loadingText: {
      color: colors.gray600,
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.medium
    },
    tableContainer: {
      overflowX: 'auto',
      borderRadius: radius.md,
      border: `1px solid ${colors.gray200}`
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: colors.surface
    },
    th: {
      padding: spacing.md,
      textAlign: 'left',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.bold,
      color: colors.gray600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      backgroundColor: colors.gray50,
      borderBottom: `1px solid ${colors.gray200}`
    },
    tr: {
      borderBottom: `1px solid ${colors.gray200}`,
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: colors.gray50
      }
    },
    td: {
      padding: spacing.md,
      verticalAlign: 'middle',
      fontSize: typography.sizes.sm,
      color: colors.gray700
    },
    status: {
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: radius.full,
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semibold,
      display: 'inline-block',
      textAlign: 'center',
      minWidth: '70px'
    },
    active: {
      backgroundColor: colors.secondaryLight,
      color: colors.secondary
    },
    inactive: {
      backgroundColor: colors.error + '20',
      color: colors.error
    },
    actions: {
      display: 'flex',
      gap: spacing.xs,
      flexWrap: 'wrap'
    },
    // BOTONES DE ACCIÓN MÁS COMPACTOS
    editButton: {
      ...baseComponents.buttonSecondary,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.sizes.xs,
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    activateButton: {
      ...baseComponents.buttonPrimary,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.sizes.xs,
      backgroundColor: colors.success,
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    deactivateButton: {
      ...baseComponents.buttonSecondary,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.sizes.xs,
      backgroundColor: colors.gray500,
      color: colors.surface,
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    deleteButton: {
      ...baseComponents.buttonDestructive,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.sizes.xs,
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed',
      ':hover': {
        transform: 'none',
        backgroundColor: 'inherit'
      }
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: spacing.md
    },
    modal: {
      ...baseComponents.card,
      padding: spacing.lg,
      width: '100%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.gray900,
      margin: `0 0 ${spacing.md} 0`
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.xs
    },
    label: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      color: colors.gray700
    },
    // INPUTS CON TEXTO BIEN ALINEADO
    input: {
      ...baseComponents.input,
      padding: `${spacing.sm} ${spacing.md}`,
      height: '42px',
      boxSizing: 'border-box',
      lineHeight: '1.5'
    },
    // CONTENEDOR DE CONTRASEÑA CON BOTÓN TOGGLE
    passwordContainer: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    passwordInput: {
      ...baseComponents.input,
      padding: `${spacing.sm} ${spacing.md}`,
      paddingRight: '50px',
      height: '42px',
      boxSizing: 'border-box',
      width: '100%',
      lineHeight: '1.5'
    },
    toggleButton: {
      position: 'absolute',
      right: spacing.sm,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: spacing.xs,
      borderRadius: radius.sm,
      color: colors.gray500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: colors.gray100,
        color: colors.gray700
      }
    },
    // SELECT CORREGIDO - TEXTO BIEN ALINEADO
    select: {
      ...baseComponents.select,
      width: '100%',
      padding: `0 ${spacing.md}`,
      height: '42px',
      boxSizing: 'border-box',
      borderRadius: radius.md,
      border: `1px solid ${colors.gray300}`,
      fontSize: typography.sizes.base,
      fontFamily: typography.fontFamily,
      backgroundColor: colors.surface,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      // Estilos específicos para el select
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
      backgroundPosition: `right ${spacing.sm} center`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '16px 16px',
      paddingRight: '40px',
      display: 'flex',
      alignItems: 'center',
      // Forzar alineación vertical del texto
      lineHeight: '42px',
      ':focus': {
        borderColor: colors.primary,
        boxShadow: `0 0 0 3px ${colors.primaryLight}`
      }
    },
    modalActions: {
      display: 'flex',
      gap: spacing.md,
      marginTop: spacing.md,
      justifyContent: 'flex-end'
    },
    // BOTONES DEL MODAL CON TEXTO CENTRADO
    submitButton: {
      ...baseComponents.buttonPrimary,
      flex: 1,
      height: '42px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    cancelButton: {
      ...baseComponents.buttonSecondary,
      flex: 1,
      height: '42px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    emptyState: {
      textAlign: 'center',
      padding: spacing.xl,
      color: colors.gray500,
      fontSize: typography.sizes.lg
    },
    roleBadge: {
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: radius.sm,
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semibold,
      backgroundColor: colors.primaryLight,
      color: colors.primary,
      textTransform: 'capitalize'
    }
  };

  // Agregar animación de spinner
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <div style={styles.loadingText}>Cargando usuarios...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header con botón de crear */}
      <div style={styles.header}>
        <h2 style={styles.title}>Gestión de Usuarios</h2>
        <button onClick={openCreateModal} style={styles.createButton}>
          <span>+</span> Crear Nuevo Usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Usuario</th>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Rol</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>
                  <strong>{user.username}</strong>
                </td>
                <td style={styles.td}>{user.name}</td>
                <td style={styles.td}>
                  <span style={styles.roleBadge}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.status,
                    ...(user.activo ? styles.active : styles.inactive)
                  }}>
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => openEditModal(user)}
                      style={styles.editButton}
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleToggleStatus(user)}
                      style={
                        user.id === currentUser?.id
                          ? { ...styles.deactivateButton, ...styles.disabledButton }
                          : (user.activo ? styles.deactivateButton : styles.activateButton)
                      }
                      disabled={user.id === currentUser?.id || actionInProgressRef.current}
                    >
                      {user.activo ? 'Desactivar' : 'Activar'}
                    </button>

                    <button
                      onClick={() => handleDelete(user)}
                      style={
                        user.id === currentUser?.id
                          ? { ...styles.deleteButton, ...styles.disabledButton }
                          : styles.deleteButton
                      }
                      disabled={user.id === currentUser?.id || actionInProgressRef.current}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div style={styles.emptyState}>
            No hay usuarios registrados en el sistema.
          </div>
        )}
      </div>

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h3>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre completo:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre de usuario:</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {editingUser ? 'Nueva contraseña (dejar en blanco para no cambiar):' : 'Contraseña:'}
                </label>
                <div style={styles.passwordContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={styles.passwordInput}
                    required={!editingUser}
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.toggleButton}
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Rol:</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="">Seleccionar rol</option>
                  <option value="operador">Operador de Logística</option>
                  <option value="receptor">Receptor de Scrap</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={styles.cancelButton}
                  disabled={actionInProgressRef.current}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    ...(actionInProgressRef.current && {
                      backgroundColor: colors.gray400,
                      cursor: 'not-allowed'
                    })
                  }}
                  disabled={actionInProgressRef.current}
                >
                  {actionInProgressRef.current ? 'Procesando...' : (editingUser ? 'Actualizar' : 'Crear')} Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;