import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  /** 当前选中日期，YYYY-MM-DD */
  value: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function DatePickerModal({ visible, value, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => dayjs(value).startOf('month'));

  useEffect(() => {
    if (visible) {
      setMonth(dayjs(value).startOf('month'));
    }
  }, [visible, value]);

  const today = dayjs().format('YYYY-MM-DD');
  const isCurrentMonth = month.isSame(dayjs(), 'month');

  const cells = useMemo(() => {
    // 周一作为一周起点，与统计页的周划分保持一致
    const lead = (month.day() + 6) % 7;
    const days = month.daysInMonth();
    const arr: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) {
      arr.push(month.date(d).format('YYYY-MM-DD'));
    }
    return arr;
  }, [month]);

  const quickChips: { label: string; date: string }[] = [
    { label: '今天', date: today },
    { label: '昨天', date: dayjs().subtract(1, 'day').format('YYYY-MM-DD') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.headerBtn, { color: colors.textHint }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>选择日期</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.chipRow}>
            {quickChips.map((chip) => (
              <TouchableOpacity
                key={chip.label}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  value === chip.date && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  onSelect(chip.date);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    value === chip.date && styles.chipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={() => setMonth(month.subtract(1, 'month'))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: colors.textPrimary }]}>{month.format('YYYY年M月')}</Text>
            <TouchableOpacity
              onPress={() => setMonth(month.add(1, 'month'))}
              disabled={isCurrentMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isCurrentMonth ? colors.textPlaceholder : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={[styles.weekText, { color: colors.textHint }]}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, i) => {
              if (cell === null) return <View key={`b${i}`} style={styles.dayCell} />;
              const isFuture = cell > today;
              const isSelected = cell === value;
              const isToday = cell === today;
              return (
                <TouchableOpacity
                  key={cell}
                  style={styles.dayCell}
                  disabled={isFuture}
                  onPress={() => onSelect(cell)}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isSelected && { backgroundColor: colors.primary },
                      isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: colors.textPrimary },
                        isFuture && { color: colors.textPlaceholder },
                        isSelected && styles.dayTextActive,
                      ]}
                    >
                      {Number(cell.slice(8))}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBtn: {
    fontSize: 14,
  },
  headerSpacer: {
    width: 28,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  dayTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});
