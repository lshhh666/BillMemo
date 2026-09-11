import dayjs from 'dayjs';
import { getDatabase } from './index';
import type { BackupFile } from './backupFormat';
import type { Transaction, Category, Budget } from '../types';

export { parseBackup } from './backupFormat';
export type { BackupFile } from './backupFormat';

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
