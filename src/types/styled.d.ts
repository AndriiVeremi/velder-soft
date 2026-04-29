import 'styled-components/native';

declare module 'styled-components/native' {
  export interface DefaultTheme {
    isDark: boolean;
    fontScale: 1 | 1.2 | 1.4;
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      f8: number;
      f10: number;
      f11: number;
      f12: number;
      f14: number;
      f15: number;
      f16: number;
      f20: number;
      f24: number;
      f32: number;
    };
    colors: {
      primary: string;
      secondary: string;
      success: string;
      error: string;
      warning: string;
      background: string;
      surface: string;
      text: string;
      textSecondary: string;
      border: string;
      accent: string;
      cardBackground: string;
    };
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    borderRadius: {
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  }
}
