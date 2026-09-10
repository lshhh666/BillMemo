import { Platform } from 'react-native';
import { openDatabaseSync, openDatabaseAsync } from 'expo-sqlite';
import { seedDatabase } from './seed';

const DB_NAME = 'billmemo.db';

let db: ReturnType<typeof openDatabaseSync> | null = null;
let webWarmUp: Promise<void> | null = null;

/**
 * Web 端 expo-sqlite 的同步 API 会自旋阻塞主线程，而 worker 的启动又依赖主线程调度，
 * 所以首次访问必须先用异步 API 把 worker 和 wasm 拉起来，之后的同步调用才不会死锁超时。
 * 刷新页面时旧 worker 释放 OPFS 文件句柄有短暂延迟，新页面抢不到句柄会打开失败，
 * 因此失败后间隔重试几次。原生端不需要预热，直接返回。
 */
export function warmUpDatabase(): Promise<void> {
  if (Platform.OS !== 'web') return Promise.resolve();
  if (!webWarmUp) {
    webWarmUp = (async () => {
      const delays = [0, 300, 600, 1000, 1500];
      let lastError: unknown;
      for (const delay of delays) {
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        try {
          const handle = await openDatabaseAsync(DB_NAME);
          await handle.closeAsync();
          return;
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    })();
  }
  return webWarmUp;
}

export function getDatabase() {
  if (!db) {
    db = openDatabaseSync(DB_NAME);
    db.execSync('PRAGMA journal_mode = WAL');
    db.execSync('PRAGMA foreign_keys = ON');
    seedDatabase(db);
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.closeSync();
    db = null;
  }
}
