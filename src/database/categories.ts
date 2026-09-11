import { getDatabase } from './index';
import type { Category, TransactionType } from '../types';

export function listCategories(): Category[] {
  return getDatabase().getAllSync<Category>('SELECT * FROM categories ORDER BY sort_order');
}

export function listCategoriesByType(type: TransactionType): Category[] {
  return getDatabase().getAllSync<Category>(
    'SELECT * FROM categories WHERE type = ? ORDER BY sort_order',
    type,
  );
}
