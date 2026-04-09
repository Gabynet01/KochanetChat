/**
 * Kochanet Semantic Color Tokens
 */

export const palette = {
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    500: '#3B82F6', // Brand Primary
    600: '#2563EB',
    700: '#1D4ED8',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9', // Surface Light
    200: '#E2E8F0', // Border Light
    300: '#CBD5E1',
    400: '#94A3B8',
    600: '#475569',
    700: '#334155',
    800: '#1E293B', // Surface Dark
    900: '#0F172A', // BG Dark
    950: '#020617',
  },
  purple: {
    400: '#A78BFA',
    500: '#8B5CF6', // AI Accent
    600: '#7C3AED',
  },
  error: {
    400: '#F87171',
    500: '#EF4444',
  },
  success: {
    400: '#34D399',
    500: '#10B981',
  },
  warning: {
    400: '#FBBF24',
    500: '#F59E0B',
  }
};

export const lightTheme = {
  bgPrimary: palette.slate[50],
  bgSecondary: palette.slate[100],
  textPrimary: palette.slate[900],
  textSecondary: palette.slate[600],
  accentBrand: palette.blue[500],
  accentAI: palette.purple[500],
  borderColor: palette.slate[200],
  error: palette.error[500],
  success: palette.success[500],
  warning: palette.warning[500],
};

export const darkTheme = {
  bgPrimary: palette.slate[950],
  bgSecondary: palette.slate[800],
  textPrimary: palette.slate[100],
  textSecondary: palette.slate[400],
  accentBrand: palette.blue[500],
  accentAI: palette.purple[400],
  borderColor: palette.slate[700],
  error: palette.error[400],
  success: palette.success[400],
  warning: palette.warning[400],
};

export type ThemeColors = typeof lightTheme;
