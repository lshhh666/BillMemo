import { getDatabase } from './index';
import { escapeLike } from '../utils/sql';
import type { DateRange } from '../utils/dateRange';
import type { Transaction, TransactionType } from '../types';

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category_name: string;
  note: string;
  date: string;
}

const ORDER = 'ORDER BY date DESC, created_at DESC';

export function listTransactionsBetween(range: DateRange, type?: TransactionType): Transaction[] {
  const db = getDatabase();
  if (type) {
    return db.getAllSync<Transaction>(
      `SELECT * FROM transactions WHERE date >= ? AND date <= ? AND type = ? ${ORDER}`,
      range.start,
      range.end,
      type,
    );
  }
  return db.getAllSync<Transaction>(
    `SELECT * FROM transactions WHERE date >= ? AND date <= ? ${ORDER}`,
    range.start,
    range.end,
  );
}

export function listAllTransactions(): Transaction[] {
  return getDatabase().getAllSync<Transaction>(`SELECT * FROM transactions ${ORDER}`);
}

/** 按备注、分类名、金额模糊搜索，关键词按字面匹配（% 和 _ 不作通配符） */
export function searchTransactions(keyword: string): Transaction[] {
  const pattern = `%${escapeLike(keyword.toLowerCase())}%`;
  return getDatabase().getAllSync<Transaction>(
    `SELECT * FROM transactions WHERE LOWER(note) LIKE ? ESCAPE '\\' OR LOWER(category_name) LIKE ? ESCAPE '\\' OR CAST(amount AS TEXT) LIKE ? ESCAPE '\\' ${ORDER}`,
    pattern,
    pattern,
    pattern,
  );
}

export function sumExpenseBetween(range: DateRange): number {
  const row = getDatabase().getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?",
    range.start,
    range.end,
  );
  return row?.total ?? 0;
}

export function sumTotalsBetween(range: DateRange): { expense: number; income: number } {
  const row = getDatabase().getFirstSync<{ expense: number; income: number }>(
    "SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense, COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income FROM transactions WHERE date >= ? AND date <= ?",
    range.start,
    range.end,
  );
  return row ?? { expense: 0, income: 0 };
}

export interface CategoryExpense {
  category_name: string;
  total: number;
}

/** 按分类汇总区间内支出；聚合在库里完成，耗时与记录数量基本无关 */
export function sumExpenseByCategoryBetween(range: DateRange): CategoryExpense[] {
  return getDatabase().getAllSync<CategoryExpense>(
    "SELECT category_name, SUM(amount) AS total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ? GROUP BY category_name",
    range.start,
    range.end,
  );
}

export function insertTransaction(input: TransactionInput, now: string): number {
  const result = getDatabase().runSync(
    'INSERT INTO transactions (type, amount, category_name, note, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    input.type,
    input.amount,
    input.category_name,
    input.note,
    input.date,
    now,
    now,
  );
  return Number(result.lastInsertRowId);
}

/** 返回受影响行数；为 0 说明记录已不存在 */
export function updateTransaction(id: number, input: TransactionInput, now: string): number {
  const result = getDatabase().runSync(
    'UPDATE transactions SET type = ?, amount = ?, category_name = ?, note = ?, date = ?, updated_at = ? WHERE id = ?',
    input.type,
    input.amount,
    input.category_name,
    input.note,
    input.date,
    now,
    id,
  );
  return result.changes;
}

export function deleteTransaction(id: number): void {
  getDatabase().runSync('DELETE FROM transactions WHERE id = ?', id);
}
