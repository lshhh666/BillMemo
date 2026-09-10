import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * React Native Web 的 Alert.alert 是空实现，浏览器里不会有任何显示。
 * Web 端退化为 window.alert / window.confirm 保证交互有反馈；原生端原样走 Alert.alert。
 * 多按钮时：style 为 cancel 的按钮对应「取消」，其余最后一个按钮对应「确定」。
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmBtn = [...buttons].reverse().find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  const ok = window.confirm(`${text}\n\n「确定」= ${confirmBtn.text ?? '确定'}`);
  if (ok) {
    confirmBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
