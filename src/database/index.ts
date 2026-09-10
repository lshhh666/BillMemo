import { Platform } from 'react-native';
import { openDatabaseSync, openDatabaseAsync } from 'expo-sqlite';
import { seedDatabase } from './seed';

const DB_NAME = 'billmemo.db';

let db: ReturnType<typeof openDatabaseSync> | null = null;
let webWarmUp: Promise<void> | null = null;

/**
 * Web 端 expo-sqlite 的同步 API 会自旋阻塞主线程，而 worker 的启动又依赖主线程调度，
 * 所以首次访问必须先用异步 API 把 worker 和 wasm 拉起来，之后的同步调用才不会死锁超时。
 * 原生端不需要预热，直接返回。
 */
export function warmUpDatabase(): Promise<void> {
  if (Platform.OS !== 'web') return Promise.resolve();
  if (!webWarmUp) {
    webWarmUp = openDatabaseAsync(DB_NAME).then((handle) => handle.closeAsync());
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
