import dayjs from 'dayjs';
import { getDatabase } from './index';
import type { Transaction, Category, Budget } from '../types';

export interface BackupFile {
  app: 'PureCash';
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  settings: { key: string; value: string }[];
}

export function createBackup(): BackupFile {
  const db = getDatabase();
  return {
    app: 'PureCash',
    version: 1,
    exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    categories: db.getAllSync<Category>('SELECT * FROM categories ORDER BY id'),
    transactions: db.getAllSync<Transaction>('SELECT * FROM transactions ORDER BY id'),
    budgets: db.getAllSync<Budget>('SELECT * FROM budgets ORDER BY id'),
    settings: db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings'),
  };
}

export function parseBackup(text: string): BackupFile {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('文件内容不是有效的 JSON');
  }
  if (
    !data ||
    data.app !== 'PureCash' ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.categories)
  ) {
    throw new Error('这不是 PureCash 的备份文件');
  }
  for (const t of data.transactions) {
    if (
      typeof t.amount !== 'number' ||
      typeof t.date !== 'string' ||
      typeof t.category_name !== 'string' ||
      (t.type !== 'expense' && t.type !== 'income')
    ) {
      throw new Error('备份文件中的账单数据格式不正确');
    }
  }
  return {
    ...data,
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    settings: Array.isArray(data.settings) ? data.settings : [],
  };
}

/** 用备份内容整体替换当前数据库，返回恢复的账单条数 */
export function restoreBackup(backup: BackupFile): number {
  const db = getDatabase();
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.withTransactionSync(() => {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM budgets');
    db.runSync('DELETE FROM categories');
    db.runSync('DELETE FROM settings');

    for (const c of backup.categories) {
      db.runSync(
        'INSERT INTO categories (id, name, type, icon, is_preset, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        c.id,
        c.name,
        c.type,
        c.icon,
        c.is_preset ?? 1,
        c.sort_order ?? 0,
        c.created_at ?? now,
      );
    }
    for (const t of backup.transactions) {
      db.runSync(
        'INSERT INTO transactions (id, type, amount, category_name, note, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        t.id,
        t.type,
        t.amount,
        t.category_name,
        t.note ?? '',
        t.date,
        t.created_at ?? now,
        t.updated_at ?? now,
      );
    }
    for (const b of backup.budgets) {
      db.runSync(
        'INSERT INTO budgets (id, month, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        b.id,
        b.month,
        b.amount,
        b.created_at ?? now,
        b.updated_at ?? now,
      );
    }
    for (const s of backup.settings) {
      db.runSync('INSERT INTO settings (key, value) VALUES (?, ?)', s.key, s.value);
    }
  });

  return backup.transactions.length;
}
