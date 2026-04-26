const baseSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const baseBorderRadius = {
  sm: 2,
  md: 6,
  lg: 12,
  xl: 20,
};

export const lightTheme = {
  isDark: false,
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
    cardBackground: '#FFFFFF',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
};

export const darkTheme = {
  isDark: true,
  colors: {
    primary: '#00b35a',
    secondary: '#00cc66',
    success: '#33cc66',
    error: '#ff5252',
    warning: '#ffca28',
    background: '#121212', 
    surface: '#1e1e1e', 
    text: '#ffffff', 
    textSecondary: '#b0b0b0', 
    border: '#2c2c2e', 
    accent: '#004d26', 
    cardBackground: '#1e1e1e',
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
};

export type ThemeType = typeof lightTheme;

export const theme = lightTheme;
