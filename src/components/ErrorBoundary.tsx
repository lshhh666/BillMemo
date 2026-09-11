import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 顶层错误边界：任何页面渲染抛出的异常都收敛到这一屏，
 * 正式包里不再白屏，用户可以重试（重试会强制重挂载子树）。
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  private retryCount = 0;

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('应用发生未捕获的错误：', error, info.componentStack);
  }

  private handleRetry = () => {
    this.retryCount += 1;
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={48} color="#E74C3C" />
          <Text style={styles.title}>出错了</Text>
          <Text style={styles.message} numberOfLines={4}>
            {this.state.error.message || '发生未知错误'}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.7}>
            <Text style={styles.btnText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <React.Fragment key={this.retryCount}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginTop: 16,
  },
  message: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  btn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#07C160',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
