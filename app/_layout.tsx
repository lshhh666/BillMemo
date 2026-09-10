import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUpdates, reloadAsync } from 'expo-updates';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { warmUpDatabase } from '../src/database';
import { showAlert } from '../src/utils/alert';

dayjs.locale('zh-cn');

// Web 端要等数据库 worker 预热完成再渲染，否则首次同步查询会死锁超时；原生端直接放行
function DatabaseGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(Platform.OS !== 'web');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    warmUpDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(e?.message ?? String(e)));
  }, [ready]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
          数据库初始化失败：{error}{'\n\n'}
          浏览器同一时间只允许一个标签页打开本应用，请关闭其他标签页后刷新。
        </Text>
      </View>
    );
  }
  if (!ready) return null;
  return <>{children}</>;
}

function RootLayoutInner() {
  const { isUpdatePending } = useUpdates();
  const { colors, isDark } = useTheme();
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (isUpdatePending && !hasPrompted.current) {
      hasPrompted.current = true;
      showAlert(
        '发现新版本',
        '是否立即重启应用以应用更新？',
        [
          { text: '稍后', style: 'cancel' },
          {
            text: '立即重启',
            onPress: () => {
              reloadAsync().catch(() => {});
            },
          },
        ],
      );
    }
  }, [isUpdatePending]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );

  // 桌面浏览器里按手机宽度居中显示，避免整个界面被拉成全屏宽
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webShell, { backgroundColor: colors.background }]}>
        <View style={styles.webFrame}>{content}</View>
      </View>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  webShell: {
    flex: 1,
    alignItems: 'center',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});

export default function RootLayout() {
  return (
    <DatabaseGate>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </DatabaseGate>
  );
}
