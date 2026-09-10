/**
 * 修补 expo-sqlite 16.0.x Web 端同步通道的两个上游 bug（原生端不走这条路径，不受影响）。
 *
 * 1. worker 把查询结果写回主线程时，用 `Uint8Array.set(new Uint32Array([length]), 0)` 写长度前缀，
 *    这是按"元素"转换而不是按"字节"拷贝，只会写入长度的最低 1 个字节；主线程却按 4 字节读取，
 *    于是任何超过 255 字节的结果都会被截断，表现为 JSON.parse "Unterminated string" 崩溃。
 * 2. 主线程等待结果时，在支持 `Atomics.pause` 的浏览器（Chrome 152+）上只自旋 100 万次就抛
 *    "Sync operation timeout"，实测仅约 50ms，首次打开数据库（加载 wasm）必然超时；
 *    不支持 pause 的分支预算是 10 亿次，这里对齐为同一数量级。
 * 3. worker 回传错误时直接 JSON 序列化 Error 对象，message 会丢失，主线程只能看到
 *    "[object Object]"；改为回传 message 字符串。
 *
 * 此脚本只改这三行，幂等，随 postinstall 执行。
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'web', 'WorkerChannel.ts');
const TAG = '[patch-expo-sqlite-web]';

if (!fs.existsSync(file)) {
  process.exit(0);
}

const replacements = [
  {
    name: '结果长度前缀按 4 字节写入',
    broken: 'resultArray.set(new Uint32Array([length]), 0);',
    fixed: 'new Uint32Array(resultBuffer, 0, 1)[0] = length;',
  },
  {
    name: 'Atomics.pause 分支的超时预算',
    broken: 'if (i > 1_000_000) {',
    fixed: 'if (i > 1_000_000_000) {',
  },
  {
    // Error 对象经 JSON 序列化后 message 会丢失，主线程只能看到 "[object Object]"
    name: '同步通道回传真实错误消息',
    broken: "const resultJson = error != null ? serialize({ error }) : serialize({ result });",
    fixed: "const resultJson = error != null ? serialize({ error: error.message || String(error) }) : serialize({ result });",
  },
];

let src = fs.readFileSync(file, 'utf8');
let changed = 0;
for (const { name, broken, fixed } of replacements) {
  if (src.includes(fixed)) {
    console.log(`${TAG} ${name}：已是修复版本`);
  } else if (src.includes(broken)) {
    src = src.replace(broken, fixed);
    changed++;
    console.log(`${TAG} ${name}：已修复`);
  } else {
    console.warn(`${TAG} ${name}：未找到目标代码，expo-sqlite 版本可能已变化，跳过`);
  }
}

if (changed > 0) {
  fs.writeFileSync(file, src);
}
