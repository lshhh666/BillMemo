import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { MonthlySummary } from '../types';

interface Props {
  summary: MonthlySummary;
  month: string;
}

export function SummaryCard({ summary, month }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={styles.month}>{month}</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>支出</Text>
          <Text style={styles.value}>
            ¥{summary.totalExpense.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
        <View style={styles.col}>
          <Text style={styles.label}>收入</Text>
          <Text style={styles.value}>
            ¥{summary.totalIncome.toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={[styles.balanceRow, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={styles.balanceLabel}>本月结余</Text>
        <Text style={styles.balanceValue}>
          ¥{summary.balance.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  month: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
