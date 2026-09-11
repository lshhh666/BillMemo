import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File as FSFile } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { createBackup, parseBackup, restoreBackup } from '../../src/database/backup';
import { getBudget, upsertBudget } from '../../src/database/budgets';
import { listAllTransactions, sumExpenseBetween } from '../../src/database/transactions';
import { THEME_MODE_KEY } from '../../src/database/settings';
import { useTheme } from '../../src/context/ThemeContext';
import { showAlert } from '../../src/utils/alert';
import { monthRange } from '../../src/utils/dateRange';
import { saveTextFile } from '../../src/utils/exportFile';
import { UpdateModal } from '../../src/components/UpdateModal';
import type { Budget } from '../../src/types';

export default function ProfileScreen() {
  const { colors, toggleTheme, isDark, setTheme } = useTheme();
  const [budgetAmount, setBudgetAmount] = useState('');
  const [savedBudget, setSavedBudget] = useState<Budget | null>(null);
  const [monthExpense, setMonthExpense] = useState(0);
  const currentMonth = dayjs().format('YYYY-MM');

  const loadData = useCallback(() => {
    const budget = getBudget(currentMonth);
    setSavedBudget(budget);
    if (budget) {
      setBudgetAmount(String(budget.amount));
    }
    setMonthExpense(sumExpenseBetween(monthRange()));
  }, [currentMonth]);

  // 每次进入页面重新加载：应用跨月保持打开时预算也要跟着切到新月
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSaveBudget = useCallback(() => {
    const num = parseFloat(budgetAmount);
    if (isNaN(num) || num <= 0) {
      showAlert('提示', '请输入有效的预算金额');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    upsertBudget(currentMonth, num, now);

    setSavedBudget({ id: 0, month: currentMonth, amount: num, created_at: now, updated_at: now });
    showAlert('保存成功', `本月预算已设为 ¥${num.toFixed(2)}`);
  }, [budgetAmount, currentMonth]);

  const handleExportCSV = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const transactions = listAllTransactions();

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
    const filename = `账单全部记录_${dayjs().format('YYYY-MM-DD')}.csv`;

    try {
      const saved = await saveTextFile(filename, csv, 'text/csv');
      if (!saved) showAlert('提示', '当前设备不支持分享功能');
    } catch (e: any) {
      showAlert('导出失败', e?.message ?? String(e));
    }
  }, []);

  const handleBackup = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const backup = createBackup();
      const filename = `PureCash备份_${dayjs().format('YYYY-MM-DD')}.json`;
      const saved = await saveTextFile(filename, JSON.stringify(backup, null, 2), 'application/json');
      if (!saved) showAlert('提示', '当前设备不支持分享功能');
    } catch (e: any) {
      showAlert('备份失败', e?.message ?? String(e));
    }
  }, []);

  const handleRestore = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;

      const asset = result.assets[0];
      const text =
        Platform.OS === 'web' && asset.file ? await asset.file.text() : await new FSFile(asset.uri).text();
      const backup = parseBackup(text);

      showAlert(
        '恢复数据',
        `备份时间：${backup.exportedAt}\n包含 ${backup.transactions.length} 笔账单。\n\n恢复会覆盖当前全部数据，是否继续？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '恢复',
            style: 'destructive',
            onPress: () => {
              try {
                const count = restoreBackup(backup);
                const theme = backup.settings.find((s) => s.key === THEME_MODE_KEY)?.value;
                if (theme === 'light' || theme === 'dark') setTheme(theme);
                loadData();
                showAlert('恢复完成', `已恢复 ${count} 笔账单`);
              } catch (e: any) {
                showAlert('恢复失败', e?.message ?? String(e));
              }
            },
          },
        ],
      );
    } catch (e: any) {
      showAlert('恢复失败', e?.message ?? String(e));
    }
  }, [loadData, setTheme]);

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

        {/* 数据管理 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleExportCSV} activeOpacity={0.6}>
            <View style={styles.menuLeft}>
              <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>导出账单 CSV</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDivider, { borderTopColor: colors.border }]}
            onPress={handleBackup}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>备份全部数据</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textPlaceholder} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDivider, { borderTopColor: colors.border }]}
            onPress={handleRestore}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="folder-open-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>从备份恢复</Text>
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
  menuItemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
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
