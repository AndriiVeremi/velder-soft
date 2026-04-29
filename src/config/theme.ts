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

export type FontScale = 1 | 1.2 | 1.4;

export function buildFontSize(scale: FontScale) {
  return {
    xs: Math.round(11 * scale),
    sm: Math.round(13 * scale),
    md: Math.round(15 * scale),
    lg: Math.round(18 * scale),
    xl: Math.round(22 * scale),
    xxl: Math.round(28 * scale),
    f8: Math.round(8 * scale),
    f10: Math.round(10 * scale),
    f11: Math.round(11 * scale),
    f12: Math.round(12 * scale),
    f14: Math.round(14 * scale),
    f15: Math.round(15 * scale),
    f16: Math.round(16 * scale),
    f20: Math.round(20 * scale),
    f24: Math.round(24 * scale),
    f32: Math.round(32 * scale),
  };
}

export const lightTheme = {
  isDark: false,
  fontScale: 1 as FontScale,
  fontSize: buildFontSize(1),
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
  fontScale: 1 as FontScale,
  fontSize: buildFontSize(1),
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

export function getCalendarTheme(t: ThemeType) {
  return {
    backgroundColor: t.colors.surface,
    calendarBackground: t.colors.surface,
    textSectionTitleColor: t.colors.textSecondary,
    selectedDayBackgroundColor: t.colors.primary,
    selectedDayTextColor: '#ffffff',
    todayTextColor: t.colors.primary,
    dayTextColor: t.colors.text,
    textDisabledColor: t.colors.border,
    dotColor: t.colors.primary,
    selectedDotColor: '#ffffff',
    arrowColor: t.colors.primary,
    disabledArrowColor: t.colors.border,
    monthTextColor: t.colors.text,
    indicatorColor: t.colors.primary,
    textDayFontWeight: '400' as const,
    textMonthFontWeight: 'bold' as const,
    textDayHeaderFontWeight: '400' as const,
  };
}
