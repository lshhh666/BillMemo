import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { AmountInput } from './AmountInput';
import { CategoryGrid } from './CategoryGrid';
import { DatePickerModal } from './DatePickerModal';
import { listCategoriesByType } from '../database/categories';
import { countCategoryUsageSince, insertTransaction, updateTransaction } from '../database/transactions';
import { rankCategories } from '../utils/categoryRanking';
import { takeEditRequest } from '../state/editRequest';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';
import type { Category, TransactionType } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** 底部弹出的记账层：首页中央 "+" 新建，点记录或滑动"编辑"进入编辑模式 */
export function AddRecordSheet({ visible, onClose, onSaved }: Props) {
  const { colors } = useTheme();
  // 编辑请求在挂载时取一次；父组件每次打开都会用不同 key 重挂载本组件
  const [editRequest] = useState(() => takeEditRequest());
  const [recordType, setRecordType] = useState<TransactionType>(editRequest?.type ?? 'expense');
  const [amount, setAmount] = useState(editRequest ? String(editRequest.amount) : '0');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    editRequest?.category_name ?? null,
  );
  const [note, setNote] = useState(editRequest?.note ?? '');
  const [date, setDate] = useState(editRequest?.date ?? dayjs().format('YYYY-MM-DD'));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(editRequest?.id ?? null);

  // 分类按最近 30 天使用次数排前（次数相同保持原顺序），默认选中的就是最常用分类
  const categories = useMemo(() => {
    const all = listCategoriesByType(recordType);
    const usage = countCategoryUsageSince(
      recordType,
      dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    );
    return rankCategories(all, usage);
  }, [recordType]);
  const currentCategory = categories.some((c) => c.name === selectedCategory)
    ? selectedCategory
    : categories.length > 0
      ? categories[0].name
      : null;

  const resetForm = useCallback(() => {
    setAmount('0');
    setNote('');
    setDate(dayjs().format('YYYY-MM-DD'));
    setEditingId(null);
  }, []);

  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      if (type === recordType) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRecordType(type);
    },
    [recordType],
  );

  const closeSheet = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // 顶部把手支持下拉关闭
  const dragY = useMemo(() => new Animated.Value(0), []);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          dragY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 1.2) {
            closeSheet();
          }
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [closeSheet, dragY],
  );

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
      onSaved('已更新记录');
    } else {
      insertTransaction(input, now);
      resetForm();
      onSaved(`已记${input.type === 'expense' ? '支出' : '收入'} ¥${numAmount.toFixed(2)}`);
    }
    onClose();
  }, [amount, currentCategory, note, date, recordType, editingId, resetForm, onSaved, onClose]);

  const accentColor = recordType === 'expense' ? colors.expense : colors.income;
  const isToday = date === dayjs().format('YYYY-MM-DD');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeSheet}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, transform: [{ translateY: dragY }] },
          ]}
        >
          <SafeAreaView edges={['bottom']} style={styles.safe}>
            <View {...pan.panHandlers} style={styles.grabZone}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {editingId !== null ? '编辑记录' : '记一笔'}
                </Text>
                {editingId !== null && (
                  <TouchableOpacity onPress={resetForm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.cancelEdit, { color: colors.primary }]}>取消编辑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.typeToggle, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  style={[styles.typeBtn, recordType === 'expense' && { backgroundColor: colors.expense }]}
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
                  style={[styles.typeBtn, recordType === 'income' && { backgroundColor: colors.income }]}
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

              <View style={styles.amountBlock}>
                <AmountInput amount={amount} onChange={setAmount} type={recordType} />
              </View>

              <CategoryGrid
                categories={categories}
                selected={currentCategory}
                onSelect={(cat: Category) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.name);
                }}
                type={recordType}
              />

              <View style={[styles.detailRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.noteInput, { color: colors.textPrimary }]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="备注（选填）"
                  placeholderTextColor={colors.textPlaceholder}
                  maxLength={50}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.dateChip}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDatePickerVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="选择日期"
                >
                  <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                    {dayjs(date).format('M月D日')}
                    {isToday ? '（今天）' : ''}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textHint} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accentColor }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveText}>{editingId !== null ? '保存修改' : '保存'}</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>

        <DatePickerModal
          key={datePickerVisible ? 'sheet-picker-open' : 'sheet-picker-closed'}
          visible={datePickerVisible}
          value={date}
          onClose={() => setDatePickerVisible(false)}
          onSelect={(d) => {
            setDate(d);
            setDatePickerVisible(false);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    // Modal 挂在页面根节点、不受外层桌面限宽框架约束，这里自行限制为手机宽度
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  safe: {
    maxHeight: '92%',
  },
  grabZone: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  cancelEdit: {
    fontSize: 14,
    fontWeight: '500',
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  amountBlock: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingLeft: 12,
  },
  dateText: {
    fontSize: 14,
  },
  saveBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
