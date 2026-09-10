import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit?: () => void;
}

export function SwipeableRow({ children, onDelete, onEdit }: Props) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const close = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const renderRightActions = useCallback(() => {
    return (
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#4DABF7' }]}
            onPress={() => {
              close();
              onEdit();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text style={styles.actionText}>编辑</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.expense }]}
          onPress={() => {
            close();
            onDelete();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={styles.actionText}>删除</Text>
        </TouchableOpacity>
      </View>
    );
  }, [colors, close, onDelete, onEdit]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '100%',
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
