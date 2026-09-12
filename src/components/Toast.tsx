import React, { useEffect, useMemo } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  /** 显示的内容；为 null 时隐藏 */
  message: string | null;
}

/** 底部轻提示：保存成功等操作的即时反馈，约 1.8 秒后自动消失 */
export function Toast({ message }: Props) {
  const { colors } = useTheme();
  const anim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (message == null) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [message, anim]);

  if (message == null) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: 'rgba(30,30,30,0.92)' },
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
            },
          ],
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 88,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    maxWidth: '86%',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
