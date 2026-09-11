import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { applyAmountKey, BACKSPACE_KEY } from '../utils/amountInput';
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
  ['.', '0', BACKSPACE_KEY],
];

export function AmountInput({ amount, onChange, type }: Props) {
  const { colors } = useTheme();
  const accentColor = type === 'expense' ? colors.expense : colors.income;

  const handlePress = useCallback(
    (key: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const next = applyAmountKey(amount, key);
      if (next !== amount) {
        onChange(next);
      }
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
              <Pressable
                key={key}
                style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.primaryLight }]}
                onPress={() => handlePress(key)}
                onLongPress={key === BACKSPACE_KEY ? handleLongPress : undefined}
              >
                <Text style={[styles.keyText, { color: colors.textPrimary }, key === BACKSPACE_KEY && { color: colors.textHint, fontSize: 18 }]}>
                  {key}
                </Text>
              </Pressable>
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
