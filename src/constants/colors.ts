// 浅色主题
const LightColors = {
  primary: '#07C160',
  primaryDark: '#06AD56',
  primaryLight: '#E8F5E9',

  expense: '#E74C3C',
  income: '#07C160',

  background: '#F5F5F5',
  surface: '#FFFFFF',
  border: '#F0F0F0',

  textPrimary: '#333333',
  textSecondary: '#666666',
  textHint: '#999999',
  textPlaceholder: '#CCCCCC',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
};

// 深色主题 (方案 B - 深灰风格)
const DarkColors = {
  primary: '#25D366',
  primaryDark: '#1DA851',
  primaryLight: 'rgba(37,211,102,0.15)',

  expense: '#FF6B6B',
  income: '#51CF66',

  background: '#121212',
  surface: '#1E1E1E',
  border: 'rgba(255,255,255,0.08)',

  textPrimary: '#E0E0E0',
  textSecondary: '#9E9E9E',
  textHint: '#616161',
  textPlaceholder: '#424242',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
};

export type ThemeColors = typeof LightColors;

export const themes: Record<string, ThemeColors> = {
  light: LightColors,
  dark: DarkColors,
};

export type ThemeMode = 'light' | 'dark';

// 向后兼容：默认导出浅色主题
export const Colors = LightColors;
