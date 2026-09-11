# PureCash（BillMemo）

极简的个人记账应用：记一笔、按月看账单、分类统计、月度预算、深色模式，数据完全存在本地。

- 技术栈：Expo SDK 54 · React Native 0.81 · expo-router · expo-sqlite · TypeScript
- 平台：iOS / Android 为主；Web 仅作开发预览

## 目录

```
app/                 expo-router 页面
  _layout.tsx        根布局：dayjs 中文、数据库预热（仅 Web）、OTA 更新提示、桌面限宽
  (tabs)/            首页(index) / 记账(record) / 统计(statistics) / 我的(profile)
src/
  components/        金额键盘、分类格子、日期选择、饼图、滑动行、更新弹窗
  database/          index.ts（打开库）、seed.ts（建表与预设分类）、
                     transactions / categories / budgets / settings（数据访问层）、
                     backup.ts（备份/恢复）、backupFormat.ts（备份文件解析校验，纯函数）
  context/           主题（持久化到 settings 表）
  state/             首页 → 记账页的"编辑请求"传递
  utils/             showAlert、saveTextFile、金额键盘规则、按天分组、日期区间、LIKE 转义（均配单元测试）
scripts/
  web-preview.js     Web 预览代理（见下文）
  patch-expo-sqlite-web.js   postinstall 补丁（见下文）
  e2e/               Web 端端到端测试
```

## 开发

```bash
npm install                 # 会自动执行 postinstall 补丁
npm run typecheck           # tsc --noEmit
npm test                    # 纯逻辑单元测试（jest-expo）
npx expo start              # 手机装 Expo Go 扫码，或按提示打开
```

### Web 预览

浏览器里预览需要两个进程：

```bash
npx expo start --port 8081  # 终端 1
npm run web:preview         # 终端 2，然后用 Chrome / Edge 打开 http://localhost:8082
```

为什么不能直接开 8081：expo-sqlite 在浏览器里用的是同步 API，依赖 `SharedArrayBuffer`，而浏览器只在页面带
`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` 响应头（跨域隔离）时才开放它。Expo CLI 返回的首页 HTML
加不上这两个头，所以 `scripts/web-preview.js` 起了一个零依赖的本地代理统一补头，并透传 WebSocket 保留热更新。

注意：
- 必须用真正的 Chrome / Edge / Firefox。某些内嵌浏览器（例如 Electron 套壳的工具内置浏览器）不开放
  `SharedArrayBuffer`，应用会显示一段提示而不是启动。
- 浏览器里同一时间只能有一个标签页打开本应用（OPFS 文件句柄独占），开第二个会初始化失败。
- 每个浏览器各自存一份数据，和手机上的数据互不相通。

### Web 端为什么有这些特殊处理

1. **expo-sqlite 补丁**（`scripts/patch-expo-sqlite-web.js`，随 `postinstall` 执行，只改 Web 端文件，原生不受影响）：
   - 结果长度前缀只写了 1 字节，超过 255 字节的查询结果会被截断；
   - Chrome 152+ 上同步等待预算只有约 50ms，首次打开数据库必然超时；
   - 错误对象序列化后丢失消息，只剩 `[object Object]`。
   升级 expo-sqlite 后若脚本提示"未找到目标代码"，说明上游已改动，需要重新核对这三处。
2. **数据库预热**（`app/_layout.tsx` 的 `DatabaseGate`）：Chrome 里 worker 的启动依赖主线程，而同步查询会把主线程自旋锁死，
   所以 Web 端首屏前先用异步 API 把 worker 和 wasm 拉起来。原生端直接放行。
3. **showAlert**（`src/utils/alert.ts`）：React Native Web 的 `Alert.alert` 是空实现，Web 端退化为浏览器原生对话框。

### 端到端测试（Web）

```bash
npm run e2e:web             # 需要上面两个进程已在运行；自动启停无头 Chrome
npm run e2e:web smoke       # 只跑基础流程
npm run e2e:web features    # 只跑编辑 / 备份 / 恢复
```

截图和下载产物在 `scripts/e2e/reports/`（已忽略提交）。找不到浏览器时可用环境变量 `CHROME_PATH` 指定。

## 发布

```bash
eas build -p android --profile preview      # 内测 APK（channel: preview）
eas update --channel preview -m "说明"      # 向该渠道推送 OTA 更新
eas build -p android --profile production   # 正式包（channel: production）
```

- 发新版本前改 `app.json` 和 `package.json` 里的 `version`，「我的」页显示的就是它。
- 「检查更新」只在 EAS 构建的独立安装包里有效；Expo Go、开发构建和 Web 会给出提示。

## 数据

SQLite 文件 `billmemo.db`，四张表：`transactions`（账单）、`categories`（分类）、`budgets`（月度预算，按月唯一）、
`settings`（键值对，目前存主题）。

- 「备份全部数据」导出 JSON（含四张表），「从备份恢复」校验后整体覆盖，在一个事务里完成。
- 「导出账单 CSV」只用于在表格软件里查看，不是恢复格式。
- 账单表存的是分类**名称**而不是 id。以后若做分类重命名，必须同步更新历史记录。

## 已知限制

- 分类不可自定义（预设 7 个支出、4 个收入）。
- 使用的 `Swipeable` 已被 react-native-gesture-handler 标记废弃，升级该库前需换成 `ReanimatedSwipeable`。
