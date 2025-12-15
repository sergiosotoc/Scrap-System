// ============================================
// SISTEMA DE DISEÑO UNIFICADO (CORREGIDO Y COMPACTO)
// ============================================

export const colors = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#DBEAFE',
  secondary: '#10B981',
  secondaryHover: '#059669',
  secondaryLight: '#D1FAE5',
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
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  background: '#F3F4F6',
  surface: '#FFFFFF',
  lcdBase: '#C4D4C4',
  lcdGradient: 'linear-gradient(180deg, #C4D4C4 0%, #B0C0B0 100%)',
  lcdText: '#1a2e1a'
};

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  base: '0 1px 3px rgba(0,0,0,0.1)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1)',
  inner: 'inset 0 2px 4px rgba(0,0,0,0.06)'
};

export const radius = {
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px'
};

export const spacing = {
  xs: '0.25rem',  
  sm: '0.5rem',   
  base: '1rem',  
  md: '1.25rem', 
  lg: '1.5rem',  
  xl: '2rem'    
};

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
    '3xl': '1.875rem' 
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800'
  }
};

const commonInputStyles = {
  padding: `${spacing.xs} ${spacing.sm}`, 
  borderRadius: radius.md,
  border: `1px solid ${colors.gray300}`,
  fontSize: typography.sizes.sm,
  fontFamily: typography.fontFamily,
  backgroundColor: colors.surface,
  transition: 'all 0.2s ease',
  outline: 'none',
  height: '38px', 
  boxSizing: 'border-box',
  lineHeight: 1.5
};

export const baseComponents = {
  buttonPrimary: {
    ...commonInputStyles,
    border: 'none',
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: 'auto', 
    ':hover': {
      backgroundColor: colors.primaryHover,
      transform: 'translateY(-1px)',
      boxShadow: shadows.sm
    },
    ':disabled': {
      backgroundColor: colors.gray400,
      cursor: 'not-allowed',
      transform: 'none'
    }
  },
  
  buttonSecondary: {
    ...commonInputStyles,
    backgroundColor: colors.surface,
    color: colors.gray700,
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: 'auto',
    ':hover': {
      backgroundColor: colors.gray50,
      borderColor: colors.gray400
    }
  },
  
  buttonDestructive: {
    ...commonInputStyles,
    border: 'none',
    backgroundColor: colors.error,
    color: '#FFFFFF',
    fontWeight: typography.weights.semibold,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: 'auto',
    ':hover': {
      backgroundColor: '#DC2626',
      transform: 'translateY(-1px)'
    }
  },
  
  input: {
    ...commonInputStyles,
    width: '100%',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    }
  },
  
  select: {
    ...commonInputStyles,
    width: '100%',
    cursor: 'pointer',
    appearance: 'none',
    paddingRight: spacing.xl,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: `right ${spacing.xs} center`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primaryLight}`
    }
  },
  
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    boxShadow: shadows.md,
    border: `1px solid ${colors.gray200}`,
    overflow: 'hidden'
  },
  
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `2px ${spacing.sm}`,
    borderRadius: radius.full,
    fontSize: '0.75rem', 
    fontWeight: typography.weights.semibold,
    letterSpacing: '0.025em',
    lineHeight: 1.2,
    whiteSpace: 'nowrap'
  }
};

export const utils = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gap: (size) => ({ display: 'flex', gap: spacing[size] || size }),
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  grid: (minWidth = '250px') => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    gap: spacing.md
  })
};

export const designSystem = { colors, shadows, radius, spacing, typography, baseComponents, utils };
export default designSystem;