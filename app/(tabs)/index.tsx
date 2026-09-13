import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { SummaryCard } from '../../src/components/SummaryCard';
import { TransactionItem } from '../../src/components/TransactionItem';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { AddRecordSheet } from '../../src/components/AddRecordSheet';
import { Toast } from '../../src/components/Toast';
import { listCategories } from '../../src/database/categories';
import { getBudget } from '../../src/database/budgets';
import {
  deleteTransaction,
  listTransactionsBetween,
  searchTransactions,
} from '../../src/database/transactions';
import { requestEdit } from '../../src/state/editRequest';
import { useTheme } from '../../src/context/ThemeContext';
import { cardShadow } from '../../src/constants/shadows';
import { showAlert } from '../../src/utils/alert';
import { monthRange } from '../../src/utils/dateRange';
import { groupByDate, type DailyGroup } from '../../src/utils/grouping';
import type { Transaction, Category, MonthlySummary, Budget } from '../../src/types';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const [groups, setGroups] = useState<DailyGroup[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DailyGroup[] | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetSeq, setSheetSeq] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 每次打开都换 key 重挂载弹层，让它从编辑请求里重新初始化
  const openSheet = useCallback(() => {
    setSheetSeq((seq) => seq + 1);
    setSheetVisible(true);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);
  const currentMonth = dayjs().format('YYYY年M月');

  const loadData = useCallback(() => {
    setCategories(listCategories());
    setBudget(getBudget(dayjs().format('YYYY-MM')));

    const transactions = listTransactionsBetween(monthRange());

    let totalExpense = 0;
    let totalIncome = 0;
    transactions.forEach((t) => {
      if (t.type === 'expense') totalExpense += t.amount;
      else totalIncome += t.amount;
    });

    setGroups(groupByDate(transactions));
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
            deleteTransaction(transaction.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData();
          },
        },
      ]);
    },
    [loadData],
  );

  const handleEdit = useCallback(
    (transaction: Transaction) => {
      requestEdit(transaction);
      openSheet();
    },
    [openSheet],
  );

  // 搜索：直接查库，覆盖所有月份（列表本身只展示当月）。
  // 停顿 200ms 再查，避免每敲一个字都触发一次同步查询；是否使用结果由渲染时的关键词决定。
  useEffect(() => {
    const keyword = searchText.trim();
    if (!keyword) return;

    const timer = setTimeout(() => {
      setSearchResults(groupByDate(searchTransactions(keyword)));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchText, groups]);

  const filteredGroups = searchText.trim() ? (searchResults ?? groups) : groups;

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
        <SummaryCard
          summary={summary}
          month={currentMonth}
          budget={budget}
          onBudgetPress={() => router.push('/profile')}
        />
        {searchStats && (
          <View style={[styles.searchStats, { backgroundColor: colors.surface }, !isDark && cardShadow]}>
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
    [summary, currentMonth, budget, searchStats, colors, isDark],
  );

  const renderItem = useCallback(
    ({ item }: { item: DailyGroup }) => (
      <View>
        <View style={[styles.dateHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.dateText, { color: colors.textHint }]}>{item.dayLabel}</Text>
          <View style={[styles.dayPill, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dayPillText, { color: colors.textHint }]}>
              {item.dayTotal >= 0 ? '结余' : '支出'} ¥{Math.abs(item.dayTotal).toFixed(2)}
            </Text>
          </View>
        </View>
        {item.transactions.map((t) => (
          <SwipeableRow
            key={t.id}
            onDelete={() => handleDelete(t)}
            onEdit={() => handleEdit(t)}
          >
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleEdit(t)}>
              <TransactionItem transaction={t} categories={categories} />
            </TouchableOpacity>
          </SwipeableRow>
        ))}
      </View>
    ),
    [categories, handleDelete, handleEdit, colors],
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
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="清空搜索"
              >
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
              accessibilityRole="button"
              accessibilityLabel="搜索"
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
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons
                name={searchText ? 'search' : 'receipt-outline'}
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyText, { color: colors.textHint }]}>
              {searchText ? '没有找到匹配的记录' : '还没有账单记录'}
            </Text>
            {!searchText && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={openSheet}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="去记一笔"
              >
                <Text style={styles.emptyBtnText}>去记一笔</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* 右下角悬浮的记账按钮 */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openSheet}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="记一笔"
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <AddRecordSheet
        key={sheetSeq}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSaved={(message) => {
          loadData();
          showToast(message);
        }}
      />
      <Toast message={toast} />
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
  dayPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dayPillText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    marginBottom: 4,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 76,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#07C160',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
