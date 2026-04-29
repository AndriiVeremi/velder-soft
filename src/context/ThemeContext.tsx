import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, ThemeType, FontScale, buildFontSize } from '../config/theme';

const THEME_KEY = '@app_theme';
const FONT_SCALE_KEY = '@app_font_scale';

interface ThemeContextType {
  isDark: boolean;
  theme: ThemeType;
  toggleTheme: () => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  theme: lightTheme,
  toggleTheme: () => {},
  fontScale: 1,
  setFontScale: () => {},
});

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemIsDark = Appearance.getColorScheme() === 'dark';
  const [isDark, setIsDark] = useState(systemIsDark);
  const [fontScale, setFontScaleState] = useState<FontScale>(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(THEME_KEY), AsyncStorage.getItem(FONT_SCALE_KEY)]).then(
      ([savedTheme, savedScale]) => {
        if (savedTheme !== null) setIsDark(savedTheme === 'dark');
        if (savedScale !== null) setFontScaleState(parseFloat(savedScale) as FontScale);
        setLoaded(true);
      }
    );
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  const setFontScale = (scale: FontScale) => {
    AsyncStorage.setItem(FONT_SCALE_KEY, String(scale));
    setFontScaleState(scale);
  };

  const base = isDark ? darkTheme : lightTheme;
  const activeTheme: ThemeType = {
    ...base,
    fontScale,
    fontSize: buildFontSize(fontScale),
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ isDark, theme: activeTheme, toggleTheme, fontScale, setFontScale }}
    >
      <ThemeProvider theme={activeTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
