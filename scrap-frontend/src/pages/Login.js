// src/pages/Login.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';
import SmoothInput from '../components/SmoothInput';
import SmoothButton from '../components/SmoothButton';
import PageWrapper from '../components/PageWrapper';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();

  const getErrorMessage = (error) => {
    const errorMessage = error.message || error.toString();
    if (errorMessage.includes('credenciales') || errorMessage.includes('invalid') || errorMessage.includes('incorrect') || errorMessage.includes('401')) return 'Usuario o contraseña incorrectos';
    if (errorMessage.includes('not found') || errorMessage.includes('no existe') || errorMessage.includes('404')) return 'El usuario no existe en el sistema';
    if (errorMessage.includes('network') || errorMessage.includes('conexión') || errorMessage.includes('fetch')) return 'Error de conexión. Verifica tu internet';
    if (errorMessage.includes('expirada') || errorMessage.includes('expired')) return 'Sesión expirada. Por favor, ingresa nuevamente';
    if (errorMessage.includes('inactivo') || errorMessage.includes('desactivado')) return 'El usuario está desactivado. Contacta al administrador';
    return errorMessage;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result.success) {
        if (result.user.role === 'admin') window.location.href = '/admin';
        else if (result.user.role === 'operador') window.location.href = '/operador';
        else if (result.user.role === 'receptor') window.location.href = '/receptor';
        else window.location.href = '/home';
      } else {
        const specificError = getErrorMessage(result.error || result);
        setError(specificError);
      }
    } catch (error) {
      const specificError = getErrorMessage(error);
      setError(specificError);
    } finally {
      setLoading(false);
    }
  };

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
      boxShadow: shadows.xl, 
      backgroundColor: colors.surface,
      margin: '0 auto' 
    },
    logoContainer: { display: 'flex', justifyContent: 'center', marginBottom: spacing.lg },
    logo: { height: '80px', width: 'auto', maxWidth: '200px', objectFit: 'contain' },
    title: {
      textAlign: 'center', fontSize: typography.sizes['2xl'], fontWeight: typography.weights.extrabold,
      color: colors.gray900, marginBottom: spacing.xs,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
    },
    subtitle: { textAlign: 'center', color: colors.gray600, fontSize: typography.sizes.lg, marginBottom: spacing.lg, fontWeight: typography.weights.medium },
    form: { display: 'flex', flexDirection: 'column', gap: spacing.md },
    input: { height: '42px' },
    error: {
      backgroundColor: colors.error + '10', color: colors.error, padding: spacing.md,
      borderRadius: radius.md, marginBottom: spacing.md, textAlign: 'center',
      fontSize: typography.sizes.sm, fontWeight: typography.weights.medium,
      border: `1px solid ${colors.error}20`, lineHeight: '1.4'
    }
  };

  return (
    <div style={styles.container}>
      <PageWrapper>
        <div style={styles.loginBox}>
          <div style={styles.logoContainer}>
            <img 
              src="/Logo-COFICAB.png" 
              alt="COFICAB Logo" 
              style={styles.logo}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          
          <h2 style={styles.title}>Sistema de Control de Scrap</h2>
          <p style={styles.subtitle}>Iniciar Sesión</p>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}
            
            <SmoothInput
                label="Usuario"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                placeholder="Ingresa tu usuario"
                required
                disabled={loading}
            />
            
            <SmoothInput
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                required
                disabled={loading}
                rightElement={
                    <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: spacing.xs, color: colors.gray500, display: 'flex', alignItems: 'center' }}
                    >
                    {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                    </button>
                }
            />
            
            <SmoothButton 
              type="submit" 
              style={{ marginTop: spacing.sm, width: '100%', height: '46px' }}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </SmoothButton>
          </form>
        </div>
      </PageWrapper>
    </div>
  );
};

export default Login;