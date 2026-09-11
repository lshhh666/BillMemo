// Web 端 E2E 入口：npm run e2e:web [smoke|features]
// 前置：npx expo start --port 8081  以及  npm run web:preview（默认访问 http://localhost:8082/）
import path from 'node:path';
import { launchChrome, killChrome, connect, REPORT_DIR } from './lib.mjs';
import * as smoke from './smoke.mjs';
import * as features from './features.mjs';

const appUrl = process.env.E2E_APP_URL ?? 'http://localhost:8082/';
const port = Number(process.env.E2E_CDP_PORT ?? 9333);
const downloadDir = path.join(REPORT_DIR, 'downloads');

try {
  const res = await fetch(appUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.headers.get('cross-origin-opener-policy')) {
    console.warn(`警告：${appUrl} 的响应缺少 COOP 头，数据库很可能无法初始化。请确认访问的是 web:preview 代理地址。`);
  }
} catch (e) {
  console.error(`无法访问 ${appUrl}：${e.message}`);
  console.error('请先在两个终端分别运行：  npx expo start --port 8081    npm run web:preview');
  process.exit(2);
}

const all = { smoke, features };
const picked = process.argv[2] ? Object.entries(all).filter(([key]) => key === process.argv[2]) : Object.entries(all);
if (picked.length === 0) {
  console.error(`未知的套件「${process.argv[2]}」，可选：${Object.keys(all).join(', ')}`);
  process.exit(2);
}

let failed = 0;
for (const [key, suite] of picked) {
  console.log(`\n=== ${suite.name} ===`);
  const chrome = await launchChrome({ port });
  let ctx;
  try {
    ctx = await connect({ port, downloadDir });
    await suite.run(ctx, { appUrl, downloadDir });
    console.log(`✓ ${suite.name} 通过`);
  } catch (e) {
    failed++;
    console.error(`✗ ${suite.name} 失败：${e.message}`);
    try {
      await ctx?.shot(`FAILED-${key}`);
    } catch {}
  } finally {
    ctx?.close();
    killChrome(chrome);
  }
}

console.log(failed ? `\n${failed} 个套件失败，截图见 scripts/e2e/reports/` : '\n全部通过');
process.exit(failed ? 1 : 0);
