import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * 数字滚动：目标值变化时从当前显示值平滑过渡到新值。
 * 用于汇总卡片这类"每次记账都会变"的数字，变化过程可见。
 */
export function useCountUp(target: number, duration = 500): string {
  const [value] = useState(() => new Animated.Value(target));
  const [display, setDisplay] = useState(target.toFixed(2));

  useEffect(() => {
    const listener = value.addListener(({ value: current }) => {
      setDisplay(current.toFixed(2));
    });

    Animated.timing(value, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => value.removeListener(listener);
  }, [target, duration, value]);

  return display;
}
