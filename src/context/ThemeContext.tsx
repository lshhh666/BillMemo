import React, { createContext, useContext, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type ThemeMode, type ThemeColors } from '../constants/colors';
import { getSetting, setSetting, THEME_MODE_KEY } from '../database/settings';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readPersistedMode(fallback: ThemeMode): ThemeMode {
  try {
    const value = getSetting(THEME_MODE_KEY);
    if (value === 'light' || value === 'dark') {
      return value;
    }
  } catch {}
  return fallback;
}

function persistMode(mode: ThemeMode) {
  try {
    setSetting(THEME_MODE_KEY, mode);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(() =>
    readPersistedMode(systemScheme === 'dark' ? 'dark' : 'light'),
  );

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      persistMode(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    persistMode(newMode);
  }, []);

  const value: ThemeContextValue = {
    mode,
    colors: themes[mode],
    isDark: mode === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 内部使用');
  }
  return context;
}
