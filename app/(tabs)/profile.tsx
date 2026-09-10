import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Paths, File as FSFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { getDatabase } from '../../src/database';
import { useTheme } from '../../src/context/ThemeContext';
import { showAlert } from '../../src/utils/alert';
import { UpdateModal } from '../../src/components/UpdateModal';
import type { Transaction, Budget } from '../../src/types';

export default function ProfileScreen() {
  const { colors, mode, toggleTheme, isDark } = useTheme();
  const [budgetAmount, setBudgetAmount] = useState('');
  const [savedBudget, setSavedBudget] = useState<Budget | null>(null);
  const [monthExpense, setMonthExpense] = useState(0);
  const currentMonth = dayjs().format('YYYY-MM');

  const loadData = useCallback(() => {
    const db = getDatabase();

    const budget = db.getFirstSync<Budget>(
      'SELECT * FROM budgets WHERE month = ?',
      currentMonth,
    );
    setSavedBudget(budget ?? null);
    if (budget) {
      setBudgetAmount(String(budget.amount));
    }

    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
    const rows = db.getAllSync<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?",
      monthStart,
      monthEnd,
    );
    setMonthExpense(rows[0]?.total ?? 0);
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBudget = useCallback(() => {
    const num = parseFloat(budgetAmount);
    if (isNaN(num) || num <= 0) {
      showAlert('提示', '请输入有效的预算金额');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const db = getDatabase();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    db.runSync(
      'INSERT OR REPLACE INTO budgets (month, amount, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM budgets WHERE month = ?), ?), ?)',
      currentMonth,
      num,
      currentMonth,
      now,
      now,
    );

    setSavedBudget({ id: 0, month: currentMonth, amount: num, created_at: now, updated_at: now });
    showAlert('保存成功', `本月预算已设为 ¥${num.toFixed(2)}`);
  }, [budgetAmount, currentMonth]);

  const handleExportCSV = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const db = getDatabase();
    const transactions = db.getAllSync<Transaction>(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC',
    );

    if (transactions.length === 0) {
      showAlert('提示', '暂无数据可导出');
      return;
    }

    const header = '日期,类型,金额,分类,备注';
    const rows = transactions.map((t) =>
      [
        t.date,
        t.type === 'expense' ? '支出' : '收入',
        t.amount.toFixed(2),
        t.category_name,
        `"${t.note.replace(/"/g, '""')}"`,
      ].join(','),
    );

    const csv = '﻿' + [header, ...rows].join('\n');
    const filename = `账单导出_${currentMonth}.csv`;
    const file = new FSFile(Paths.cache, filename);
    await file.write(csv);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: '导出账单',
      });
    } else {
      showAlert('提示', '当前设备不支持分享功能');
    }
  }, [currentMonth]);

  const budgetUsagePct =
    savedBudget && savedBudget.amount > 0
      ? Math.min((monthExpense / savedBudget.amount) * 100, 100)
      : 0;

  const [checking, setChecking] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const updateId = Updates.updateId?.slice(0, 8);

  const isOverBudget = savedBudget && monthExpense > savedBudget.amount;

  const isExpoGo = Constants.appOwnership === 'expo';

  // 更新弹窗状态
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleCheckUpdate = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isExpoGo) {
      showAlert('提示', 'Expo Go 中代码已实时生效，无需检查更新。\n如需在线更新，请使用 EAS 构建的独立版本。');
      return;
    }
    if (__DEV__) {
      showAlert('提示', '开发模式下不支持检查更新，请使用 EAS 发布构建测试在线更新。');
      return;
    }

    setChecking(true);
    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        setUpdateVersion(appVersion);
        setShowUpdateModal(true);
      } else {
        showAlert('提示', '当前已是最新版本');
      }
    } catch (e: any) {
      showAlert('检查失败', e?.message ?? String(e));
    } finally {
      setChecking(false);
    }
  }, [appVersion, isExpoGo]);

  const handleDownloadUpdate = useCallback(async () => {
    setDownloading(true);
    try {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        setShowUpdateModal(false);
        showAlert(
          '下载完成',
          '是否立即重启应用以应用更新？',
          [
            { text: '稍后', style: 'cancel' },
            {
              text: '立即重启',
              onPress: () => {
                Updates.reloadAsync().catch(() => {});
              },
            },
          ],
        );
      } else {
        setShowUpdateModal(false);
        showAlert('提示', '当前已是最新版本');
      }
    } catch (e: any) {
      setShowUpdateModal(false);
      showAlert('下载失败', e?.message ?? String(e));
    } finally {
      setDownloading(false);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>我的</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 主题切换 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme} activeOpacity={0.6}>
            <View style={styles.menuLeft}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>深色模式</Text>
            </View>
            <View style={[styles.themeToggle, { backgroundColor: isDark ? colors.primary : colors.border }]}>
              <View style={[styles.themeDot, { transform: [{ translateX: isDark ? 18 : 0 }] }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 预算设置 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>月度预算</Text>
          </View>
          <Text style={[styles.monthLabel, { color: colors.textHint }]}>{dayjs().format('YYYY年M月')}</Text>

          {savedBudget ? (
            <View style={styles.budgetStatus}>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>预算</Text>
                <Text style={[styles.budgetValue, { color: colors.textPrimary }]}>¥{savedBudget.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>已用</Text>
                <Text
                  style={[
                    styles.budgetValue,
                    { color: isOverBudget ? colors.expense : colors.textPrimary },
                  ]}
                >
                  ¥{monthExpense.toFixed(2)}
                </Text>
              </View>
              {/* 进度条 */}
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${budgetUsagePct}%`,
                      backgroundColor: isOverBudget
                        ? colors.expense
                        : budgetUsagePct > 80
                          ? '#FFA94D'
                          : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textHint }]}>
                已使用 {budgetUsagePct.toFixed(0)}%
                {isOverBudget ? '（已超支！）' : ''}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noBudget, { color: colors.textPlaceholder }]}>暂无预算设置</Text>
          )}

          <View style={styles.inputRow}>
            <Text style={[styles.inputPrefix, { color: colors.textHint }]}>¥</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              placeholder="输入月度预算"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveBudget} activeOpacity={0.7}>
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 数据导出 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleExportCSV} activeOpacity={0.6}>
            <View style={styles.menuLeft}>
              <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>导出账单 CSV</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </TouchableOpacity>
        </View>

        {/* 检查更新 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCheckUpdate}
            activeOpacity={0.6}
            disabled={checking}
          >
            <View style={styles.menuLeft}>
              {checking ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.textSecondary} />
              )}
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>检查更新</Text>
            </View>
            <View style={styles.menuRight}>
              {checking ? (
                <Text style={[styles.menuHint, { color: colors.textPlaceholder }]}>检查中...</Text>
              ) : (
                <Text style={[styles.menuHint, { color: colors.textPlaceholder }]}>v{appVersion}{updateId ? ` (${updateId})` : ''}</Text>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 关于 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>关于 PureCash</Text>
            </View>
          </View>
          <View style={[styles.aboutContent, { borderTopColor: colors.border }]}>
            <Text style={[styles.aboutText, { color: colors.textHint }]}>
              PureCash 是一款极简的个人记账应用，帮助你轻松管理日常收支。{'\n\n'}
              数据完全存储在本地，无需注册账号，保护你的隐私安全。
            </Text>
          </View>
        </View>
      </ScrollView>

      <UpdateModal
        visible={showUpdateModal}
        version={updateVersion}
        downloading={downloading}
        onClose={() => setShowUpdateModal(false)}
        onDownload={handleDownloadUpdate}
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
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 13,
    marginBottom: 12,
  },
  budgetStatus: {
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  budgetLabel: {
    fontSize: 14,
  },
  budgetValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  noBudget: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 15,
  },
  menuHint: {
    fontSize: 14,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aboutContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 12,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 20,
  },
  themeToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
  },
  themeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
});
