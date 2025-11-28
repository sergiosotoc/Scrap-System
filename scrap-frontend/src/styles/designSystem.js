// ============================================
// SISTEMA DE DISEÑO UNIFICADO
// ============================================

// Sistema de colores consistente
export const colors = {
  // Primarios
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#DBEAFE',
  
  // Secundarios
  secondary: '#10B981',
  secondaryHover: '#059669',
  secondaryLight: '#D1FAE5',
  
  // Grises
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Estados
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Fondos
  background: '#F3F4F6',
  surface: '#FFFFFF',
  
  // Báscula LCD
  lcdBase: '#C4D4C4',
  lcdGradient: 'linear-gradient(180deg, #C4D4C4 0%, #B0C0B0 100%)',
  lcdText: '#1a2e1a'
};

// Sombras consistentes
export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  base: '0 1px 3px rgba(0,0,0,0.1)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1)',
  inner: 'inset 0 2px 4px rgba(0,0,0,0.06)'
};

// Bordes redondeados
export const radius = {
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px'
};

// Espaciados
export const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  base: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem'
};

// Tipografía
export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem'
  },
  
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800'
  }
};

// Componentes base modernos
export const baseComponents = {
  // Botón primario
  buttonPrimary: {
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radius.md,
    border: 'none',
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: shadows.sm,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    ':hover': {
      backgroundColor: colors.primaryHover,
      transform: 'translateY(-1px)',
      boxShadow: shadows.md
    },
    ':disabled': {
      backgroundColor: colors.gray400,
      cursor: 'not-allowed',
      transform: 'none'
    }
  },
  
  // Botón secundario
  buttonSecondary: {
    backgroundColor: colors.surface,
    color: colors.gray700,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radius.md,
    border: `1px solid ${colors.gray300}`,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: shadows.sm,
    ':hover': {
      backgroundColor: colors.gray50,
      borderColor: colors.gray400
    }
  },
  
  // Botón destructivo
  buttonDestructive: {
    backgroundColor: colors.error,
    color: '#FFFFFF',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radius.md,
    border: 'none',
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: shadows.sm,
    ':hover': {
      backgroundColor: '#DC2626',
      transform: 'translateY(-1px)'
    }
  },
  
  // Input moderno
  input: {
    width: '100%',
    padding: spacing.sm,
    borderRadius: radius.md,
    border: `1px solid ${colors.gray300}`,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.surface,
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    }
  },
  
  // Select moderno
  select: {
    width: '100%',
    padding: spacing.sm,
    borderRadius: radius.md,
    border: `1px solid ${colors.gray300}`,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.surface,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    }
  },
  
  // Card moderna
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    boxShadow: shadows.md,
    border: `1px solid ${colors.gray200}`,
    overflow: 'hidden'
  },
  
  // Badge
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.full,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: '0.025em'
  }
};

// Utilidades para estilos comunes
export const utils = {
  // Centrado flex
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // Espaciado entre elementos
  gap: (size) => ({
    display: 'flex',
    gap: spacing[size] || size
  }),
  
  // Texto truncado
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  
  // Grid responsivo
  grid: (minWidth = '250px') => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    gap: spacing.md
  })
};

// Exportar como objeto nombrado para evitar el error
export const designSystem = {
  colors,
  shadows,
  radius,
  spacing,
  typography,
  baseComponents,
  utils
};

export default designSystem;