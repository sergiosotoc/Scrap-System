/* src/components/routes/UserManagment.js */
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
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

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      console.log(' Cargando Usuarios...');
      const usersData = await apiClient.getUsers();
      console.log('Usuarios cargados: ', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      console.error('Detalles del error:', {
        message: error.message,
        stack: error.stack
      });

      alert('Error al cargar usuarios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
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

  // Enviar formulario (crear o actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = { ...formData };
      
      // Si estamos editando y no se cambió la contraseña, no enviarla
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      if (editingUser) {
        await apiClient.updateUser(editingUser.id, submitData);
        alert('Usuario actualizado exitosamente');
      } else {
        await apiClient.createUser(submitData);
        alert('Usuario creado exitosamente');
      }

      setShowModal(false);
      loadUsers(); // Recargar lista
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Cambiar estado activo/inactivo
  const handleToggleStatus = async (user) => {
    console.log('Intentando cambiar estado usuario:', {
      id: user.id,
      nomre: user.name,
      usuario_actual: currentUser?.id
    });

    if (user.id === currentUser?.id) {
      alert('No puedes desactivar tu propio usuario');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres ${user.activo ? 'desactivar' : 'activar'} a ${user.name}?`)) {
      return;
    }

    try {
      await apiClient.toggleUserStatus(user.id);
      alert(`Usuario ${user.activo ? 'desactivado' : 'activado'} exitosamente`);
      loadUsers();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Eliminar usuario
  const handleDelete = async (user) => {
    console.log('Intentado eliminar usuario:', {
      id: user.id,
      nombre: user.name,
      usuario_actual: currentUser.id
    });

    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${user.name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await apiClient.deleteUser(user.id);
      alert('Usuario eliminado exitosamente');
      loadUsers();
    } catch (error) {
      alert('Error: ' + error.message);
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

  if (loading) {
    return <div style={styles.loading}>Cargando usuarios...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header con botón de crear */}
      <div style={styles.header}>
        <h2>Gestión de Usuarios</h2>
        <button onClick={openCreateModal} style={styles.createButton}>
          + Crear Nuevo Usuario
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
                <td style={styles.td}>{user.username}</td>
                <td style={styles.td}>{user.name}</td>
                <td style={styles.td}>{getRoleLabel(user.role)}</td>
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
                      disabled={user.id === currentUser?.id}
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
                      disabled={user.id === currentUser?.id}
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
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>
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
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  style={styles.input}
                  required={!editingUser}
                  minLength="6"
                />
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
                  <option value="operador">Operador de Logística</option>
                  <option value="receptor">Receptor de Scrap</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="submit" style={styles.submitButton}>
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={styles.cancelButton}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  createButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
  },
  tr: {
    borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '1rem',
    verticalAlign: 'middle',
  },
  status: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 'bold',
  },
  active: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  inactive: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  editButton: {
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  activateButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  deactivateButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
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
  },
  modal: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  checkbox: {
    marginRight: '0.5rem',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  submitButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6c757d',
    fontSize: '1.1rem',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none',
},
};

export default UserManagement;