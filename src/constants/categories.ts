import { Category } from '../types';

export interface PresetCategory {
  name: string;
  type: 'expense' | 'income';
  icon: string;
}

export const PRESET_EXPENSE_CATEGORIES: PresetCategory[] = [
  { name: '餐饮', type: 'expense', icon: '🍔' },
  { name: '交通', type: 'expense', icon: '🚇' },
  { name: '购物', type: 'expense', icon: '🛒' },
  { name: '娱乐', type: 'expense', icon: '🎮' },
  { name: '居住', type: 'expense', icon: '🏠' },
  { name: '医疗', type: 'expense', icon: '💊' },
  { name: '其他', type: 'expense', icon: '📦' },
];

export const PRESET_INCOME_CATEGORIES: PresetCategory[] = [
  { name: '工资', type: 'income', icon: '💰' },
  { name: '兼职', type: 'income', icon: '💼' },
  { name: '理财', type: 'income', icon: '📈' },
  { name: '其他', type: 'income', icon: '📦' },
];

export function getCategoryIcon(
  categories: Category[],
  categoryName: string,
): string {
  const found = categories.find((c) => c.name === categoryName);
  return found?.icon ?? '📌';
}
