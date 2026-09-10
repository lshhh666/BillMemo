import React, { createContext, useContext, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type ThemeMode, type ThemeColors } from '../constants/colors';
import { getDatabase } from '../database';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = 'theme_mode';

function readPersistedMode(fallback: ThemeMode): ThemeMode {
  try {
    const db = getDatabase();
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      THEME_KEY,
    );
    if (row?.value === 'light' || row?.value === 'dark') {
      return row.value;
    }
  } catch {}
  return fallback;
}

function persistMode(mode: ThemeMode) {
  try {
    const db = getDatabase();
    db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', THEME_KEY, mode);
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
