import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  version?: string;
  updateMessage?: string;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export function UpdateModal({
  visible,
  version,
  updateMessage,
  downloading,
  onClose,
  onDownload,
}: Props) {
  const { colors } = useTheme();

  const items = updateMessage
    ? updateMessage.split('\n').filter((l) => l.trim())
    : ['修复已知问题，提升使用体验'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={downloading ? undefined : onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* 彩色顶条 */}
          <View style={[styles.topBar, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={styles.topBarText}>新版本发布</Text>
          </View>

          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {version ? `v${version} 更新内容` : '发现新版本'}
            </Text>

            {/* 检查列表 */}
            <View style={styles.checkList}>
              {items.map((item, i) => (
                <View key={i} style={styles.checkItem}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={[styles.checkText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>

            {/* 按钮 */}
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={onDownload}
              activeOpacity={0.7}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
                  <Text style={styles.btnText}>下载更新</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={downloading}
            >
              <Text style={[styles.skipText, { color: colors.textHint }]}>暂时跳过</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  topBarText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  body: { padding: 24 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  checkList: { gap: 12, marginBottom: 24 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { fontSize: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14 },
});
