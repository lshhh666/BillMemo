import { StyleSheet } from 'react-native';

/** 浅色模式下的卡片一级投影。深色模式下投影不可见，各卡片改用主题自带的描边分层 */
export const cardShadow = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
}).card;
