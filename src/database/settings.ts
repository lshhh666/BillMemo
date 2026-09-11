import { getDatabase } from './index';

export const THEME_MODE_KEY = 'theme_mode';

export function getSetting(key: string): string | null {
  const row = getDatabase().getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDatabase().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}
