import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import { PieChart, PIE_COLORS } from '../../src/components/PieChart';
import { listTransactionsBetween } from '../../src/database/transactions';
import { useTheme } from '../../src/context/ThemeContext';
import { monthRange, weekComparisonAnchor, weekRange } from '../../src/utils/dateRange';

interface CategoryStat {
  label: string;
  value: number;
}

interface WeekCompareItem {
  label: string;
  color: string;
  thisWeek: number;
  lastWeek: number;
}

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [weekCompare, setWeekCompare] = useState<WeekCompareItem[]>([]);

  const loadData = useCallback(() => {
    const transactions = listTransactionsBetween(monthRange(currentMonth));

    let expense = 0;
    let income = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        expense += t.amount;
        catMap[t.category_name] = (catMap[t.category_name] || 0) + t.amount;
      } else {
        income += t.amount;
      }
    });

    setTotalExpense(expense);
    setTotalIncome(income);

    const cats: CategoryStat[] = Object.entries(catMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    setCategoryStats(cats);

    // 分类周趋势：查看当月时比较本周 vs 上周；查看历史月份时以该月最后一天所在的周为基准
    const anchor = weekComparisonAnchor(currentMonth);
    const thisWeek = weekRange(anchor);
    const lastWeek = weekRange(anchor.subtract(1, 'week'));

    const weekTransactions = listTransactionsBetween(
      { start: lastWeek.start, end: thisWeek.end },
      'expense',
    );

    const thisWeekMap: Record<string, number> = {};
    const lastWeekMap: Record<string, number> = {};

    weekTransactions.forEach((t) => {
      if (t.date >= thisWeek.start) {
        thisWeekMap[t.category_name] = (thisWeekMap[t.category_name] || 0) + t.amount;
      } else {
        lastWeekMap[t.category_name] = (lastWeekMap[t.category_name] || 0) + t.amount;
      }
    });

    const allCats = new Set([...Object.keys(thisWeekMap), ...Object.keys(lastWeekMap)]);
    const compare: WeekCompareItem[] = [];
    const sortedCats = [...allCats].sort((a, b) => {
      const twA = thisWeekMap[a] || 0;
      const twB = thisWeekMap[b] || 0;
      return twB - twA;
    });

    sortedCats.forEach((cat, i) => {
      const tw = thisWeekMap[cat] || 0;
      const lw = lastWeekMap[cat] || 0;
      if (tw > 0 || lw > 0) {
        compare.push({
          label: cat,
          thisWeek: tw,
          lastWeek: lw,
          color: PIE_COLORS[i % PIE_COLORS.length],
        });
      }
    });

    setWeekCompare(compare);
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const prevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'));
  const nextMonth = () => {
    if (currentMonth.isBefore(dayjs(), 'month')) {
      setCurrentMonth(currentMonth.add(1, 'month'));
    }
  };

  const isCurrentMonth = currentMonth.isSame(dayjs(), 'month');
  const weekAnchor = weekComparisonAnchor(currentMonth);
  const [thisWeekLabel, lastWeekLabel] = isCurrentMonth ? ['本周', '上周'] : ['月末周', '前一周'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>统计</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 月份切换 */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.textPrimary }]}>{currentMonth.format('YYYY年M月')}</Text>
          <TouchableOpacity
            onPress={nextMonth}
            style={[styles.monthBtn, isCurrentMonth && styles.monthBtnDisabled]}
            disabled={isCurrentMonth}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isCurrentMonth ? colors.textPlaceholder : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* 收支总览 */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, { backgroundColor: 'rgba(231,76,60,0.1)' }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>支出</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              ¥{totalExpense.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>收入</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              ¥{totalIncome.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* 分类饼图 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>支出分类分布</Text>
          <PieChart data={categoryStats} size={Math.min(width - 80, 240)} />
          {/* 图例 */}
          <View style={styles.legend}>
            {categoryStats.slice(0, 6).map((cat, i) => (
              <View key={cat.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 分类周趋势 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>分类周趋势</Text>
          <Text style={[styles.weekRange, { color: colors.textHint }]}>
            {weekAnchor.startOf('week').format('M/D')} - {weekAnchor.endOf('week').format('M/D')} vs{' '}
            {weekAnchor.subtract(1, 'week').startOf('week').format('M/D')} - {weekAnchor.subtract(1, 'week').endOf('week').format('M/D')}
          </Text>
          {weekCompare.length === 0 ? (
            <Text style={[styles.noData, { color: colors.textHint }]}>近两周暂无支出</Text>
          ) : (
            <>
              <View style={[styles.weekHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.weekHeaderLabel, { color: colors.textHint }, { flex: 1 }]}>分类</Text>
                <Text style={[styles.weekHeaderLabel, { color: colors.textHint }, styles.weekAmt]}>{thisWeekLabel}</Text>
                <Text style={[styles.weekHeaderLabel, { color: colors.textHint }, styles.weekAmt]}>{lastWeekLabel}</Text>
                <Text style={[styles.weekHeaderLabel, { color: colors.textHint }, styles.weekChange]}>变化</Text>
              </View>
              {weekCompare.map((item) => {
                const change = item.lastWeek > 0
                  ? ((item.thisWeek - item.lastWeek) / item.lastWeek) * 100
                  : item.thisWeek > 0 ? 100 : 0;
                const isUp = change > 0;
                const maxVal = Math.max(
                  ...weekCompare.map((c) => Math.max(c.thisWeek, c.lastWeek)),
                  1,
                );
                return (
                  <View key={item.label} style={[styles.weekRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.weekCat}>
                      <View style={[styles.weekDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.weekCatText, { color: colors.textPrimary }]} numberOfLines={1}>{item.label}</Text>
                    </View>
                    <View style={styles.weekAmt}>
                      <Text style={[styles.weekVal, { color: colors.textPrimary }]}>¥{item.thisWeek.toFixed(0)}</Text>
                      <View style={[styles.weekBarBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.weekBar, { width: `${(item.thisWeek / maxVal) * 100}%`, backgroundColor: item.color }]} />
                      </View>
                    </View>
                    <View style={styles.weekAmt}>
                      <Text style={[styles.weekVal, styles.weekValOld, { color: colors.textHint }]}>¥{item.lastWeek.toFixed(0)}</Text>
                      <View style={[styles.weekBarBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.weekBar, { width: `${(item.lastWeek / maxVal) * 100}%`, backgroundColor: colors.textHint }]} />
                      </View>
                    </View>
                    <View style={styles.weekChange}>
                      <Ionicons
                        name={isUp ? 'arrow-up' : change < 0 ? 'arrow-down' : 'remove'}
                        size={12}
                        color={isUp ? colors.expense : change < 0 ? colors.income : colors.textHint}
                      />
                      <Text style={[
                        styles.weekChangeText,
                        { color: isUp ? colors.expense : change < 0 ? colors.income : colors.textHint },
                      ]}>
                        {Math.abs(change).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* 排行 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>支出排行</Text>
          {categoryStats.length === 0 ? (
            <Text style={[styles.noData, { color: colors.textHint }]}>本月暂无支出</Text>
          ) : (
            categoryStats.map((cat, i) => (
              <View key={cat.label} style={[styles.rankItem, { borderBottomColor: colors.border }]}>
                <View style={styles.rankLeft}>
                  <Text style={[styles.rankNum, { color: colors.textHint }]}>{i + 1}</Text>
                  <Text style={[styles.rankLabel, { color: colors.textPrimary }]}>{cat.label}</Text>
                </View>
                <View style={styles.rankRight}>
                  <Text style={[styles.rankValue, { color: colors.textPrimary }]}>¥{cat.value.toFixed(2)}</Text>
                  <View style={[styles.rankBarWrap, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.rankBar,
                        {
                          width: `${totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  monthBtn: {
    padding: 8,
  },
  monthBtnDisabled: {
    opacity: 0.4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 100,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  weekRange: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  weekHeaderLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekCat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  weekCatText: {
    fontSize: 12,
    flexShrink: 1,
  },
  weekAmt: {
    width: 70,
    marginRight: 4,
  },
  weekVal: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  weekValOld: {
    fontWeight: '400',
  },
  weekBarBg: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  weekBar: {
    height: 3,
    borderRadius: 2,
  },
  weekChange: {
    width: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  weekChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 20,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 72,
    marginRight: 8,
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '700',
    width: 22,
  },
  rankLabel: {
    fontSize: 14,
    flexShrink: 1,
  },
  rankRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankValue: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
    minWidth: 80,
  },
  rankBarWrap: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rankBar: {
    height: 5,
    borderRadius: 3,
  },
});
