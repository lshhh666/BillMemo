import { Tabs, router } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { openAddSheet } from '../../src/state/addSheet';

const TABS = [
  { name: 'index', title: '首页', icon: 'home' },
  { name: 'statistics', title: '统计', icon: 'pie-chart' },
  { name: 'profile', title: '我的', icon: 'person' },
] as const;

export default function TabLayout() {
  const { colors } = useTheme();

  const renderTabBar = ({ state, navigation, insets }: any) => {
    const items = state.routes.map((route: { key: string; name: string }, index: number) => {
      const tab = TABS.find((t) => t.name === route.name);
      if (!tab) return null;
      const isFocused = state.index === index;
      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };
      return (
        <Pressable
          key={route.name}
          onPress={onPress}
          style={styles.tabItem}
          accessibilityRole="button"
          accessibilityLabel={tab.title}
          accessibilityState={{ selected: isFocused }}
        >
          <Ionicons name={tab.icon} size={22} color={isFocused ? colors.primary : colors.textHint} />
          <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textHint }]}>
            {tab.title}
          </Text>
        </Pressable>
      );
    });

    return (
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom ?? 0, 6),
          },
        ]}
      >
        {items[0]}
        <Pressable
          onPress={() => {
            router.navigate({ pathname: '/' });
            openAddSheet();
          }}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="记一笔"
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>
        {items.slice(1)}
      </View>
    );
  };

  return (
    <Tabs screenOptions={{ headerShown: false, lazy: false }} tabBar={renderTabBar}>
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen name="statistics" options={{ title: '统计' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginHorizontal: 8,
    shadowColor: '#07C160',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
