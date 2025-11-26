// src/pages/Login.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 Intentando login con:', { username });
    
    try {
      const result = await login(username, password);
      
      console.log('📋 Resultado del login:', result);
      
      if (result.success) {
        console.log('✅ Login exitoso, redirigiendo...');
        console.log('👤 Usuario:', result.user);
        console.log('🎯 Rol:', result.user.role);
        
        // Redirigir según el rol - CORREGIDO PARA RECEPTOR
        if (result.user.role === 'admin') {
          console.log('🔄 Redirigiendo a /admin');
          window.location.href = '/admin';
        } else if (result.user.role === 'operador') {
          console.log('🔄 Redirigiendo a /operador');
          window.location.href = '/operador';
        } else if (result.user.role === 'receptor') {
          console.log('🔄 Redirigiendo a /receptor');
          window.location.href = '/receptor';
        } else {
          console.log('🔄 Redirigiendo a /home');
          window.location.href = '/home';
        }
      } else {
        console.error('❌ Error en login:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('💥 Error capturado en handleSubmit:', error);
      setError('Error inesperado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h2 style={styles.title}>Sistema de Control de Scrap</h2>
        <p style={styles.subtitle}>Iniciar Sesión</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Usuario:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Ingresa tu usuario"
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          
          <button 
            type="submit" 
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div style={styles.demo}>
          <p><strong>Usuarios de prueba:</strong></p>
          <p>👑 Admin: admin / scrap2025</p>
          <p>👨‍💼 Operador: operador1 / operador123</p>
          <p>🏷️ Receptor: receptor1 / receptor123</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '0.5rem',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#333',
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
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '0.75rem',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  demo: {
    marginTop: '2rem',
    padding: '1rem',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
};

export default Login;