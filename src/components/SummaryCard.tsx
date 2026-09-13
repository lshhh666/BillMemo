import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCountUp } from '../hooks/useCountUp';
import type { MonthlySummary, Budget } from '../types';

interface Props {
  summary: MonthlySummary;
  month: string;
  budget?: Budget | null;
  onBudgetPress?: () => void;
}

export function SummaryCard({ summary, month, budget, onBudgetPress }: Props) {
  const { colors, isDark } = useTheme();
  // 记账后数字平滑滚到新值，而不是瞬间跳变
  const expenseText = useCountUp(summary.totalExpense);
  const incomeText = useCountUp(summary.totalIncome);
  const balanceText = useCountUp(summary.balance);
  const budgetAmount = budget?.amount ?? 0;
  const remaining = budgetAmount - summary.totalExpense;
  const overBudget = budgetAmount > 0 && remaining < 0;
  const usagePct =
    budgetAmount > 0 ? Math.min((summary.totalExpense / budgetAmount) * 100, 100) : 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.primary },
        !isDark && styles.containerShadow,
      ]}
    >
      <Text style={styles.month}>{month}支出</Text>
      <Text style={styles.expenseValue} adjustsFontSizeToFit numberOfLines={1}>
        ¥{expenseText}
      </Text>
      <View style={styles.secondaryRow}>
        <Text style={styles.secondaryText}>收入 ¥{incomeText}</Text>
        <Text style={styles.secondaryText}>结余 ¥{balanceText}</Text>
      </View>

      <TouchableOpacity
        style={styles.budgetRow}
        onPress={onBudgetPress}
        activeOpacity={onBudgetPress ? 0.7 : 1}
        disabled={!onBudgetPress}
      >
        {budgetAmount > 0 ? (
          <View>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>本月剩余</Text>
              <Text
                style={[styles.budgetRemaining, overBudget && { color: '#FFE08A' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {overBudget
                  ? `已超支 ¥${Math.abs(remaining).toFixed(2)}`
                  : `¥${remaining.toFixed(2)}`}
              </Text>
            </View>
            <View style={styles.budgetTrack}>
              <View
                style={[
                  styles.budgetFill,
                  { width: `${usagePct}%`, backgroundColor: overBudget ? '#FFE08A' : '#FFFFFF' },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.budgetEmpty}>
            <Text style={styles.budgetEmptyText}>未设置月度预算</Text>
            <Text style={styles.budgetEmptyAction}>去设置</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  containerShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  month: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 8,
  },
  expenseValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  secondaryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontVariant: ['tabular-nums'],
  },
  budgetRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  budgetRemaining: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  budgetTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  budgetFill: {
    height: 5,
    borderRadius: 2.5,
  },
  budgetEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  budgetEmptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  budgetEmptyAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
