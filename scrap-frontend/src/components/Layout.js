/* src/components/Layout.js */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, spacing, typography, baseComponents } from '../styles/designSystem';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  // const navigate = useNavigate(); // Descomentar si usas React Router
  const [isHovered, setIsHovered] = useState(false);

  // Función robusta para manejar el cierre de sesión
  const handleLogout = async () => {
    try {
      // Intentamos ejecutar la función logout del contexto
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesión en contexto:", error);
    } finally {
      // IMPORTANTE: Forzamos la redirección aquí mismo.
      // Esto asegura que el usuario vaya al login inmediatamente
      // sin pasar por pantallas de "No autorizado".
      window.location.href = '/login';
    }
  };

  // 1. Lógica de Redirección automática (por si la sesión expira sola)
  useEffect(() => {
    // Verificamos si no hay usuario o si el objeto usuario está vacío/inválido
    if (!user) {
      window.location.href = '/login';
    }
  }, [user]);

  // Protección: Si no hay usuario, no renderizamos nada para evitar errores
  // al intentar acceder a {user.name}
  if (!user) return null;

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.background,
      fontFamily: typography.fontFamily
    },
    header: {
      backgroundColor: colors.surface,
      padding: `${spacing.md} ${spacing.lg}`,
      boxShadow: shadows.md,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${colors.gray200}`,
      position: 'sticky', // Mejora: Header fijo
      top: 0,
      zIndex: 10
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md
    },
    logo: {
      height: '40px',
      width: 'auto',
    },
    title: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.gray900,
      margin: 0,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.lg, // Aumentado un poco para separar info del botón
      color: colors.gray700
    },
    userDetails: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      lineHeight: '1.2'
    },
    // 2. Estilo mejorado del botón
    logoutButton: {
      ...baseComponents.buttonSecondary,
      padding: `${spacing.xs} ${spacing.md}`,
      fontSize: typography.sizes.sm,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      // Aplicamos estilos condicionales basados en el estado hover
      backgroundColor: isHovered ? colors.gray100 : colors.surface,
      color: isHovered ? colors.error : colors.gray700, // Texto rojo al pasar el mouse
      borderColor: isHovered ? colors.error : colors.gray300,
      boxShadow: isHovered ? shadows.md : shadows.sm,
    },
    main: {
      padding: spacing.lg,
      minHeight: 'calc(100vh - 80px)'
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img 
            src="/Logo-COFICAB.png" 
            alt="COFICAB Logo" 
            style={styles.logo}
          />
          <h1 style={styles.title}>Sistema de Control de Scrap</h1>
        </div>
        
        <div style={styles.userInfo}>
          {/* Mejora visual de la info del usuario */}
          <div style={styles.userDetails}>
            <span style={{ fontWeight: typography.weights.bold, color: colors.gray800 }}>
              {user.name || 'Usuario'}
            </span>
            <span style={{ fontSize: typography.sizes.xs, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {user.role || 'Rol'}
            </span>
          </div>

          <button 
            onClick={handleLogout} 
            style={styles.logoutButton}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Cerrar sesión"
          >
            {/* Icono SVG de Logout */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
