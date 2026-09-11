import 'dayjs/locale/zh-cn.js';
import dayjs from 'dayjs';
import { groupByDate } from '../grouping';
import type { Transaction } from '../../types';

dayjs.locale('zh-cn');

function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'date' | 'amount' | 'type'>): Transaction {
  return {
    category_name: '餐饮',
    note: '',
    created_at: `${partial.date} 12:00:00`,
    updated_at: `${partial.date} 12:00:00`,
    ...partial,
  };
}

describe('groupByDate', () => {
  test('空列表返回空数组', () => {
    expect(groupByDate([])).toEqual([]);
  });

  test('按日期分组并倒序排列', () => {
    const groups = groupByDate([
      tx({ id: 1, date: '2026-09-09', amount: 10, type: 'expense' }),
      tx({ id: 2, date: '2026-09-10', amount: 20, type: 'expense' }),
      tx({ id: 3, date: '2026-09-09', amount: 5, type: 'expense' }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-09-10', '2026-09-09']);
    expect(groups[1].transactions.map((t) => t.id)).toEqual([1, 3]);
  });

  test('日合计：支出为正、收入为负', () => {
    const [group] = groupByDate([
      tx({ id: 1, date: '2026-09-10', amount: 30, type: 'expense' }),
      tx({ id: 2, date: '2026-09-10', amount: 100, type: 'income' }),
    ]);
    expect(group.dayTotal).toBe(-70);
  });

  test('日期标签使用中文星期', () => {
    const [group] = groupByDate([tx({ id: 1, date: '2026-09-10', amount: 1, type: 'expense' })]);
    expect(group.dayLabel).toBe('9月10日 星期四');
  });
});
