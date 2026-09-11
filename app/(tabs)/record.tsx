import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { AmountInput } from '../../src/components/AmountInput';
import { CategoryGrid } from '../../src/components/CategoryGrid';
import { DatePickerModal } from '../../src/components/DatePickerModal';
import { listCategoriesByType } from '../../src/database/categories';
import { insertTransaction, updateTransaction } from '../../src/database/transactions';
import { takeEditRequest } from '../../src/state/editRequest';
import { useTheme } from '../../src/context/ThemeContext';
import { showAlert } from '../../src/utils/alert';
import type { Category, TransactionType } from '../../src/types';

export default function RecordScreen() {
  const { colors } = useTheme();
  const [recordType, setRecordType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 分类随收支类型变化，本地库同步读取，直接在渲染时算，避免 effect 里同步 setState
  const categories = useMemo(() => listCategoriesByType(recordType), [recordType]);
  // 选中的分类不在当前类型的列表里（如刚切换了类型）时，回退到第一个
  const currentCategory = categories.some((c) => c.name === selectedCategory)
    ? selectedCategory
    : categories.length > 0
      ? categories[0].name
      : null;

  useFocusEffect(
    useCallback(() => {
      const request = takeEditRequest();
      if (!request) return;
      setEditingId(request.id);
      setRecordType(request.type);
      setAmount(String(request.amount));
      setSelectedCategory(request.category_name);
      setNote(request.note);
      setDate(request.date);
    }, []),
  );

  const resetForm = useCallback(() => {
    setAmount('0');
    setNote('');
    setDate(dayjs().format('YYYY-MM-DD'));
    setEditingId(null);
  }, []);

  // 切换收支类型时保留已输入的金额：数字不需要重输，只有分类会随类型重新选择
  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      if (type === recordType) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRecordType(type);
    },
    [recordType],
  );

  const handleCategorySelect = useCallback((cat: Category) => {
    setSelectedCategory(cat.name);
  }, []);

  const handleSave = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      showAlert('提示', '请输入金额');
      return;
    }
    if (!currentCategory) {
      showAlert('提示', '请选择分类');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const input = {
      type: recordType,
      amount: numAmount,
      category_name: currentCategory,
      note: note.trim(),
      date,
    };

    if (editingId !== null) {
      const changes = updateTransaction(editingId, input, now);
      resetForm();
      if (changes === 0) {
        showAlert('保存失败', '这条记录已经被删除了');
        return;
      }
      showAlert('已保存', '记录已更新');
      router.replace('/');
      return;
    }

    insertTransaction(input, now);
    resetForm();

    showAlert('保存成功', '', [
      { text: '继续记', style: 'cancel' },
      {
        text: '回首页',
        onPress: () => router.replace('/'),
      },
    ]);
  }, [amount, currentCategory, note, date, recordType, editingId, resetForm]);

  const accentColor = recordType === 'expense' ? colors.expense : colors.income;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {editingId !== null ? '编辑记录' : '记一笔'}
          </Text>
          {editingId !== null && (
            <TouchableOpacity onPress={resetForm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.cancelEdit, { color: colors.primary }]}>取消编辑</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 类型切换 */}
          <View style={[styles.typeToggle, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                recordType === 'expense' && { backgroundColor: colors.expense },
              ]}
              onPress={() => handleTypeChange('expense')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: colors.textSecondary },
                  recordType === 'expense' && styles.typeTextActive,
                ]}
              >
                支出
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                recordType === 'income' && { backgroundColor: colors.income },
              ]}
              onPress={() => handleTypeChange('income')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: colors.textSecondary },
                  recordType === 'income' && styles.typeTextActive,
                ]}
              >
                收入
              </Text>
            </TouchableOpacity>
          </View>

          {/* 金额输入 */}
          <View style={styles.section}>
            <AmountInput amount={amount} onChange={setAmount} type={recordType} />
          </View>

          {/* 分类选择 */}
          <View style={styles.section}>
            <CategoryGrid
              categories={categories}
              selected={currentCategory}
              onSelect={handleCategorySelect}
              type={recordType}
            />
          </View>

          {/* 备注 & 日期 */}
          <View style={styles.section}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>备注</Text>
                <TextInput
                  style={[styles.detailInput, { color: colors.textPrimary }]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="选填"
                  placeholderTextColor={colors.textPlaceholder}
                  maxLength={50}
                />
              </View>
              <View style={[styles.detailRow, styles.detailRowLast]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>日期</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDatePickerVisible(true);
                  }}
                >
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                    {date}
                    {date === dayjs().format('YYYY-MM-DD') ? '（今天）' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 保存按钮 */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accentColor }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveText}>{editingId !== null ? '保存修改' : '保存'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 弹窗打开时通过 key 重新挂载，让月份视图从当前选中日期开始 */}
      <DatePickerModal
        key={datePickerVisible ? 'picker-open' : 'picker-closed'}
        visible={datePickerVisible}
        value={date}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(d) => {
          setDate(d);
          setDatePickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  cancelEdit: {
    fontSize: 15,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  detailCard: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    marginLeft: 16,
  },
  detailValue: {
    fontSize: 14,
  },
  saveBtn: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
