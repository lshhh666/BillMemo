import { Platform } from 'react-native';
import { Paths, File as FSFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * 把文本内容以文件形式交给用户：手机上走系统分享面板，浏览器里直接触发下载。
 * 返回 false 表示当前环境没有可用的保存途径。
 */
export async function saveTextFile(filename: string, content: string, mimeType: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  const file = new FSFile(Paths.cache, filename);
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
  return true;
}
