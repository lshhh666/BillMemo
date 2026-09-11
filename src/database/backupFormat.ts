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

/** 解析并校验备份文件内容；不合法时抛出带中文说明的错误 */
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
