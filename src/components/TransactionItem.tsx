import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { Transaction, Category } from '../types';

interface Props {
  transaction: Transaction;
  categories: Category[];
}

export const TransactionItem = memo(function TransactionItem({
  transaction,
  categories,
}: Props) {
  const { colors } = useTheme();
  const cat = categories.find((c) => c.name === transaction.category_name);
  const isExpense = transaction.type === 'expense';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
        <Text style={styles.icon}>{cat?.icon ?? '📌'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.category, { color: colors.textPrimary }]}>{transaction.category_name}</Text>
        {transaction.note ? (
          <Text style={[styles.note, { color: colors.textHint }]} numberOfLines={1}>
            {transaction.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            { color: isExpense ? colors.expense : colors.income },
          ]}
        >
          {isExpense ? '-' : '+'}
          {transaction.amount.toFixed(2)}
        </Text>
        <Text style={[styles.time, { color: colors.textHint }]}>
          {transaction.created_at.split(' ')[1]?.slice(0, 5) ?? ''}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: 15,
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
});
