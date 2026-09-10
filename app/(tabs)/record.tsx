import React, { useCallback, useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { AmountInput } from '../../src/components/AmountInput';
import { CategoryGrid } from '../../src/components/CategoryGrid';
import { getDatabase } from '../../src/database';
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
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = useCallback(() => {
    const db = getDatabase();
    const cats = db.getAllSync<Category>(
      'SELECT * FROM categories WHERE type = ? ORDER BY sort_order',
      recordType,
    );
    setCategories(cats);
    const current = cats.find((c) => c.name === selectedCategory);
    if (!current) {
      setSelectedCategory(cats.length > 0 ? cats[0].name : null);
    }
  }, [recordType, selectedCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleTypeChange = useCallback((type: TransactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecordType(type);
    setAmount('0');
  }, []);

  const handleCategorySelect = useCallback((cat: Category) => {
    setSelectedCategory(cat.name);
  }, []);

  const handleSave = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      showAlert('提示', '请输入金额');
      return;
    }
    if (!selectedCategory) {
      showAlert('提示', '请选择分类');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const db = getDatabase();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    db.runSync(
      'INSERT INTO transactions (type, amount, category_name, note, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      recordType,
      numAmount,
      selectedCategory,
      note.trim(),
      date,
      now,
      now,
    );

    // 重置表单
    setAmount('0');
    setNote('');
    setDate(dayjs().format('YYYY-MM-DD'));

    showAlert('保存成功', '', [
      { text: '继续记', style: 'cancel' },
      {
        text: '回首页',
        onPress: () => router.replace('/'),
      },
    ]);
  }, [amount, selectedCategory, note, date, recordType]);

  const accentColor = recordType === 'expense' ? colors.expense : colors.income;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>记一笔</Text>
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
              selected={selectedCategory}
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
                    showAlert('提示', '日期编辑功能将在后续迭代中实现');
                  }}
                >
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{date}</Text>
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
            <Text style={styles.saveText}>保存</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
