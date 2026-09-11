import dayjs from 'dayjs';
import type { Transaction } from '../types';

export interface DailyGroup {
  date: string;
  dayLabel: string;
  /** 当日净支出：支出为正、收入为负 */
  dayTotal: number;
  transactions: Transaction[];
}

/** 按日期分组，日期倒序；组内保持传入顺序 */
export function groupByDate(transactions: Transaction[]): DailyGroup[] {
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });

  return Object.entries(grouped)
    .map(([date, items]) => ({
      date,
      dayLabel: dayjs(date).format('M月D日 dddd'),
      dayTotal: items.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0),
      transactions: items,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
