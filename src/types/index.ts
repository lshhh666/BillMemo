export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category_name: string;
  note: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  is_preset: number;
  sort_order: number;
  created_at?: string;
}

export interface Budget {
  id: number;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  totalExpense: number;
  totalIncome: number;
  balance: number;
}
