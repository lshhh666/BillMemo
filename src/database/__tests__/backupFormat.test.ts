import { parseBackup } from '../backupFormat';

const validBackup = {
  app: 'PureCash',
  version: 1,
  exportedAt: '2026-09-10 12:00:00',
  categories: [{ id: 1, name: '餐饮', type: 'expense', icon: '🍔', is_preset: 1, sort_order: 0 }],
  transactions: [
    {
      id: 1,
      type: 'expense',
      amount: 88,
      category_name: '餐饮',
      note: '',
      date: '2026-09-10',
      created_at: '2026-09-10 12:00:00',
      updated_at: '2026-09-10 12:00:00',
    },
  ],
};

describe('parseBackup', () => {
  test('合法备份：缺省的 budgets / settings 补为空数组', () => {
    const backup = parseBackup(JSON.stringify(validBackup));
    expect(backup.transactions).toHaveLength(1);
    expect(backup.budgets).toEqual([]);
    expect(backup.settings).toEqual([]);
  });

  test('保留已有的 budgets / settings', () => {
    const backup = parseBackup(
      JSON.stringify({ ...validBackup, budgets: [{ id: 1, month: '2026-09', amount: 3000 }], settings: [{ key: 'theme_mode', value: 'dark' }] }),
    );
    expect(backup.budgets).toHaveLength(1);
    expect(backup.settings[0].value).toBe('dark');
  });

  test('不是 JSON', () => {
    expect(() => parseBackup('not json')).toThrow('文件内容不是有效的 JSON');
  });

  test('不是本应用的备份', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'Other', transactions: [], categories: [] }))).toThrow(
      '这不是 PureCash 的备份文件',
    );
    expect(() => parseBackup(JSON.stringify({ app: 'PureCash', categories: [] }))).toThrow(
      '这不是 PureCash 的备份文件',
    );
  });

  test('账单字段不合法', () => {
    const broken = { ...validBackup, transactions: [{ ...validBackup.transactions[0], amount: '88' }] };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow('备份文件中的账单数据格式不正确');

    const badType = { ...validBackup, transactions: [{ ...validBackup.transactions[0], type: 'transfer' }] };
    expect(() => parseBackup(JSON.stringify(badType))).toThrow('备份文件中的账单数据格式不正确');
  });
});
