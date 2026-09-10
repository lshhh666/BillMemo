import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { SummaryCard } from '../../src/components/SummaryCard';
import { TransactionItem } from '../../src/components/TransactionItem';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { getDatabase } from '../../src/database';
import { useTheme } from '../../src/context/ThemeContext';
import { showAlert } from '../../src/utils/alert';
import type { Transaction, Category, MonthlySummary } from '../../src/types';

interface DailyGroup {
  date: string;
  dayLabel: string;
  dayTotal: number;
  transactions: Transaction[];
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const [groups, setGroups] = useState<DailyGroup[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const currentMonth = dayjs().format('YYYY年M月');

  const loadData = useCallback(() => {
    const db = getDatabase();
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

    const cats = db.getAllSync<Category>('SELECT * FROM categories ORDER BY sort_order');
    setCategories(cats);

    const transactions = db.getAllSync<Transaction>(
      'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC',
      monthStart,
      monthEnd,
    );

    let totalExpense = 0;
    let totalIncome = 0;

    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      if (t.type === 'expense') totalExpense += t.amount;
      else totalIncome += t.amount;

      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });

    const dailyGroups: DailyGroup[] = Object.entries(grouped).map(([date, items]) => {
      const dayTotal = items.reduce((sum, t) => {
        return sum + (t.type === 'expense' ? t.amount : -t.amount);
      }, 0);

      return {
        date,
        dayLabel: dayjs(date).format('M月D日 dddd'),
        dayTotal,
        transactions: items,
      };
    });

    dailyGroups.sort((a, b) => b.date.localeCompare(a.date));

    setGroups(dailyGroups);
    setSummary({ totalExpense, totalIncome, balance: totalIncome - totalExpense });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleDelete = useCallback(
    (transaction: Transaction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showAlert('删除记录', `确定要删除这笔${transaction.type === 'expense' ? '支出' : '收入'}记录吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const db = getDatabase();
            db.runSync('DELETE FROM transactions WHERE id = ?', transaction.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData();
          },
        },
      ]);
    },
    [loadData],
  );

  // 搜索过滤
  const filteredGroups = useMemo(() => {
    if (!searchText.trim()) return groups;

    const keyword = searchText.trim().toLowerCase();
    const filtered: DailyGroup[] = [];

    groups.forEach((group) => {
      const matchedTransactions = group.transactions.filter((t) => {
        // 搜索备注
        if (t.note && t.note.toLowerCase().includes(keyword)) return true;
        // 搜索分类
        if (t.category_name.toLowerCase().includes(keyword)) return true;
        // 搜索金额
        if (t.amount.toString().includes(keyword)) return true;
        return false;
      });

      if (matchedTransactions.length > 0) {
        const dayTotal = matchedTransactions.reduce((sum, t) => {
          return sum + (t.type === 'expense' ? t.amount : -t.amount);
        }, 0);

        filtered.push({
          ...group,
          dayTotal,
          transactions: matchedTransactions,
        });
      }
    });

    return filtered;
  }, [groups, searchText]);

  // 搜索统计
  const searchStats = useMemo(() => {
    if (!searchText.trim()) return null;

    let count = 0;
    let totalAmount = 0;
    filteredGroups.forEach((g) => {
      count += g.transactions.length;
      g.transactions.forEach((t) => {
        if (t.type === 'expense') totalAmount += t.amount;
      });
    });

    return { count, totalAmount };
  }, [filteredGroups, searchText]);

  const renderHeader = useCallback(
    () => (
      <>
        <SummaryCard summary={summary} month={currentMonth} />
        {searchStats && (
          <View style={[styles.searchStats, { backgroundColor: colors.surface }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textHint }]}>找到记录</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{searchStats.count} 笔</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textHint }]}>支出合计</Text>
              <Text style={[styles.statValue, { color: colors.expense }]}>¥{searchStats.totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </>
    ),
    [summary, currentMonth, searchStats, colors],
  );

  const renderItem = useCallback(
    ({ item }: { item: DailyGroup }) => (
      <View>
        <View style={[styles.dateHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.dateText, { color: colors.textHint }]}>{item.dayLabel}</Text>
          <Text style={[styles.dateAmount, { color: colors.textHint }]}>
            {item.dayTotal >= 0 ? '结余' : '支出'} ¥
            {Math.abs(item.dayTotal).toFixed(2)}
          </Text>
        </View>
        {item.transactions.map((t) => (
          <SwipeableRow
            key={t.id}
            onDelete={() => handleDelete(t)}
          >
            <TransactionItem transaction={t} categories={categories} />
          </SwipeableRow>
        ))}
      </View>
    ),
    [categories, handleDelete, colors],
  );

  const keyExtractor = useCallback((item: DailyGroup) => item.date, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        {isSearching ? (
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={18} color={colors.textHint} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="搜索备注、分类、金额..."
              placeholderTextColor={colors.textPlaceholder}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textHint} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                setIsSearching(false);
                setSearchText('');
              }}
            >
              <Text style={[styles.cancelBtn, { color: colors.primary }]}>取消</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>账单</Text>
            <TouchableOpacity
              onPress={() => setIsSearching(true)}
              style={styles.searchIcon}
            >
              <Ionicons name="search" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <FlashList
        data={filteredGroups}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{searchText ? '🔍' : '📝'}</Text>
            <Text style={[styles.emptyText, { color: colors.textHint }]}>
              {searchText ? '没有找到匹配的记录' : '还没有账单记录'}
            </Text>
            {!searchText && (
              <Text style={[styles.emptyHint, { color: colors.textPlaceholder }]}>点击底部「记账」开始记录</Text>
            )}
          </View>
        }
      />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  searchIcon: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearBtn: {
    padding: 2,
  },
  cancelBtn: {
    fontSize: 15,
    fontWeight: '500',
    paddingLeft: 4,
  },
  searchStats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  list: {
    paddingBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateAmount: {
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
  },
});
