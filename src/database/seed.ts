import type { SQLiteDatabase } from 'expo-sqlite';
import { PRESET_EXPENSE_CATEGORIES, PRESET_INCOME_CATEGORIES } from '../constants/categories';

export function seedDatabase(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      icon TEXT NOT NULL,
      is_preset INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount REAL NOT NULL,
      category_name TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const existing = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM categories WHERE is_preset = 1',
  );

  if (existing && existing.cnt === 0) {
    const insert = db.prepareSync(
      'INSERT INTO categories (name, type, icon, is_preset, sort_order) VALUES (?, ?, ?, 1, ?)',
    );

    const all = [...PRESET_EXPENSE_CATEGORIES, ...PRESET_INCOME_CATEGORIES];
    all.forEach((cat, index) => {
      insert.executeSync(cat.name, cat.type, cat.icon, index);
    });

    insert.finalizeSync();
  }
}
