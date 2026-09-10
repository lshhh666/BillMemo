import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface Props {
  amount: string;
  onChange: (value: string) => void;
  type: 'expense' | 'income';
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export function AmountInput({ amount, onChange, type }: Props) {
  const { colors } = useTheme();
  const accentColor = type === 'expense' ? colors.expense : colors.income;

  const handlePress = useCallback(
    (key: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (key === '⌫') {
        onChange(amount.slice(0, -1) || '0');
        return;
      }

      let next = amount === '0' ? '' : amount;

      if (key === '.') {
        if (next.includes('.')) return;
        if (next === '') next = '0';
        onChange(next + '.');
        return;
      }

      next += key;

      // 限制小数点后两位
      const dotIndex = next.indexOf('.');
      if (dotIndex !== -1 && next.length - dotIndex > 3) return;

      // 限制最大金额 999999999.99
      if (parseFloat(next) > 999999999.99) return;

      onChange(next);
    },
    [amount, onChange],
  );

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange('0');
  }, [onChange]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.display, { borderBottomColor: colors.border }]}>
        <Text style={[styles.currency, { color: colors.textHint }]}>¥</Text>
        <Text style={[styles.amount, { color: accentColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {amount}
        </Text>
      </View>
      <View style={styles.keypad}>
        {KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.key}
                onPress={() => handlePress(key)}
                onLongPress={key === '⌫' ? handleLongPress : undefined}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, { color: colors.textPrimary }, key === '⌫' && { color: colors.textHint, fontSize: 18 }]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  display: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  currency: {
    fontSize: 20,
    marginRight: 4,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    minWidth: 40,
  },
  keypad: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  key: {
    flex: 1,
    aspectRatio: 1 / 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
  },
});
