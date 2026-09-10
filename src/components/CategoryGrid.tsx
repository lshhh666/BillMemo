import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import type { Category } from '../types';

interface Props {
  categories: Category[];
  selected: string | null;
  onSelect: (category: Category) => void;
  type: 'expense' | 'income';
}

const COLS = 5;

export function CategoryGrid({ categories, selected, onSelect, type }: Props) {
  const { colors } = useTheme();
  const accentColor = type === 'expense' ? colors.expense : colors.income;

  const handleSelect = useCallback(
    (cat: Category) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(cat);
    },
    [onSelect],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textHint }]}>选择分类</Text>
      <View style={styles.grid}>
        {categories.map((cat) => {
          const isSelected = selected === cat.name;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.item,
                isSelected && {
                  backgroundColor:
                    type === 'expense' ? 'rgba(231,76,60,0.1)' : colors.primaryLight,
                },
              ]}
              onPress={() => handleSelect(cat)}
              activeOpacity={0.6}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.background },
                  isSelected && {
                    borderWidth: 2,
                    borderColor: accentColor,
                  },
                ]}
              >
                <Text style={styles.icon}>{cat.icon}</Text>
              </View>
              <Text
                style={[
                  styles.name,
                  { color: colors.textSecondary },
                  isSelected && { color: accentColor, fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  item: {
    width: `${100 / COLS}%`,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 18,
  },
  name: {
    fontSize: 11,
  },
});
