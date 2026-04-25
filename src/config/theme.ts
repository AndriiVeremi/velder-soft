export const theme = {
  colors: {
    primary: '#008744',
    secondary: '#005c2d',
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    background: '#f4f7f6',
    surface: '#FFFFFF',
    text: '#1a1a1a',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    accent: '#e6f4ea',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 2,
    md: 6,
    lg: 12,
    xl: 20,
  },
};

export type ThemeType = typeof theme;
