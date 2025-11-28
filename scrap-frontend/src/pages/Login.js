// src/pages/Login.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();

  // Función para analizar el error y devolver un mensaje específico
  const getErrorMessage = (error) => {
    const errorMessage = error.message || error.toString();
    
    console.log('🔍 Analizando error:', errorMessage);
    
    // Buscar patrones específicos en el mensaje de error
    if (errorMessage.includes('credenciales') || 
        errorMessage.includes('invalid') || 
        errorMessage.includes('incorrect') ||
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized')) {
      return 'Usuario o contraseña incorrectos';
    }
    
    if (errorMessage.includes('not found') || 
        errorMessage.includes('no existe') || 
        errorMessage.includes('404') ||
        errorMessage.includes('usuario no encontrado')) {
      return 'El usuario no existe en el sistema';
    }
    
    if (errorMessage.includes('network') || 
        errorMessage.includes('conexión') || 
        errorMessage.includes('fetch') ||
        errorMessage.includes('CORS')) {
      return 'Error de conexión. Verifica tu internet o contacta al administrador';
    }
    
    if (errorMessage.includes('expirada') || 
        errorMessage.includes('expired') || 
        errorMessage.includes('token')) {
      return 'Sesión expirada. Por favor, ingresa nuevamente';
    }
    
    if (errorMessage.includes('inactivo') || 
        errorMessage.includes('inactive') || 
        errorMessage.includes('desactivado')) {
      return 'El usuario está desactivado. Contacta al administrador';
    }
    
    // Si no coincide con ningún patrón conocido, mostrar el mensaje original
    return errorMessage;
  };

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
        
        if (result.user.role === 'admin') {
          window.location.href = '/admin';
        } else if (result.user.role === 'operador') {
          window.location.href = '/operador';
        } else if (result.user.role === 'receptor') {
          window.location.href = '/receptor';
        } else {
          window.location.href = '/home';
        }
      } else {
        // Si el login devuelve un error específico
        const specificError = getErrorMessage(result.error || result);
        setError(specificError);
      }
    } catch (error) {
      console.error('❌ Error en el login:', error);
      const specificError = getErrorMessage(error);
      setError(specificError);
    } finally {
      setLoading(false);
    }
  };

  // Función para alternar visibilidad de contraseña
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // ==========================================
  // ESTILOS MEJORADOS - CON BOTÓN DE VISIBILIDAD
  // ==========================================
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: colors.background,
      fontFamily: typography.fontFamily,
      padding: spacing.md
    },
    loginBox: {
      ...baseComponents.card,
      padding: spacing.xl,
      width: '100%',
      maxWidth: '440px',
      boxShadow: shadows.xl
    },
    logoContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: spacing.lg
    },
    logo: {
      height: '80px',
      width: 'auto',
      maxWidth: '200px',
      objectFit: 'contain',
      filter: 'brightness(0) invert(0)'
    },
    title: {
      textAlign: 'center',
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.extrabold,
      color: colors.gray900,
      marginBottom: spacing.xs,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      textAlign: 'center',
      color: colors.gray600,
      fontSize: typography.sizes.lg,
      marginBottom: spacing.lg,
      fontWeight: typography.weights.medium
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.xs
    },
    label: {
      display: 'block',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      color: colors.gray700
    },
    // INPUTS MÁS COMPACTOS
    input: {
      ...baseComponents.input,
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.sizes.sm,
      height: '42px',
      boxSizing: 'border-box'
    },
    // CONTENEDOR DE CONTRASEÑA CON BOTÓN
    passwordContainer: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    passwordInput: {
      ...baseComponents.input,
      padding: `${spacing.sm} ${spacing.md}`,
      paddingRight: '50px',
      fontSize: typography.sizes.sm,
      height: '42px',
      boxSizing: 'border-box',
      width: '100%'
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
    // BOTÓN MÁS COMPACTO
    button: {
      ...baseComponents.buttonPrimary,
      padding: `${spacing.sm} ${spacing.lg}`,
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.semibold,
      marginTop: spacing.sm,
      height: '46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%'
    },
    error: {
      backgroundColor: colors.error + '10',
      color: colors.error,
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.md,
      textAlign: 'center',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      border: `1px solid ${colors.error}20`,
      lineHeight: '1.4'
    },
    demo: {
      marginTop: spacing.lg,
      padding: spacing.md,
      backgroundColor: colors.gray50,
      borderRadius: radius.lg,
      fontSize: typography.sizes.sm,
      color: colors.gray700,
      border: `1px solid ${colors.gray200}`
    },
    demoTitle: {
      fontWeight: typography.weights.bold,
      color: colors.gray900,
      marginBottom: spacing.xs
    },
    demoItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${spacing.xs} 0`,
      borderBottom: `1px solid ${colors.gray200}`,
      ':last-child': {
        borderBottom: 'none'
      }
    },
    roleBadge: {
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: radius.sm,
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semibold,
      backgroundColor: colors.primaryLight,
      color: colors.primary
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        {/* Logo agregado */}
        <div style={styles.logoContainer}>
          <img 
            src="/Logo-COFICAB.png" 
            alt="COFICAB Logo" 
            style={styles.logo}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        
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
              disabled={loading}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña:</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                placeholder="Ingresa tu contraseña"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                style={styles.toggleButton}
                disabled={loading}
              >
                {showPassword ? (
                  <span title="Ocultar contraseña">👁️</span>
                ) : (
                  <span title="Mostrar contraseña">🔒</span>
                )}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            style={{
              ...styles.button,
              ...(loading && { 
                backgroundColor: colors.gray400, 
                cursor: 'not-allowed',
                transform: 'none'
              })
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={{ marginRight: spacing.xs }}>⏳</span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
        
        <div style={styles.demo}>
          <p style={styles.demoTitle}>Usuarios de prueba:</p>
          <div style={styles.demoItem}>
            <span>👑 Admin</span>
            <div>
              <span style={{ marginRight: spacing.sm, color: colors.gray600 }}>admin / scrap2025</span>
              <span style={styles.roleBadge}>Administrador</span>
            </div>
          </div>
          <div style={styles.demoItem}>
            <span>👨‍💼 Operador</span>
            <div>
              <span style={{ marginRight: spacing.sm, color: colors.gray600 }}>operador1 / operador123</span>
              <span style={{...styles.roleBadge, backgroundColor: colors.secondaryLight, color: colors.secondary}}>Operador</span>
            </div>
          </div>
          <div style={styles.demoItem}>
            <span>🏷️ Receptor</span>
            <div>
              <span style={{ marginRight: spacing.sm, color: colors.gray600 }}>receptor1 / receptor123</span>
              <span style={{...styles.roleBadge, backgroundColor: colors.warning + '20', color: colors.warning}}>Receptor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;