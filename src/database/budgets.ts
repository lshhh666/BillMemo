import { getDatabase } from './index';
import type { Budget } from '../types';

/** @param month YYYY-MM */
export function getBudget(month: string): Budget | null {
  return getDatabase().getFirstSync<Budget>('SELECT * FROM budgets WHERE month = ?', month) ?? null;
}

/** 新建或覆盖某月预算，保留首次创建时间 */
export function upsertBudget(month: string, amount: number, now: string): void {
  getDatabase().runSync(
    'INSERT OR REPLACE INTO budgets (month, amount, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM budgets WHERE month = ?), ?), ?)',
    month,
    amount,
    month,
    now,
    now,
  );
}
