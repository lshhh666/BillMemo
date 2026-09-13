# PureCash 图标系统使用说明

本压缩包是 PureCash 的完整图标资产包，包含 App 主图标、Android Adaptive Icon、单色图标、启动页图标、Web Favicon，以及 10 个账单分类图标。

## 目录结构

```text
PureCash_Icon_System/
├─ README_使用说明.md
├─ README_使用说明.txt
├─ brand/
│  ├─ app-icon.svg
│  ├─ app-icon.png
│  ├─ mono-icon.svg
│  ├─ mono-icon.png
│  ├─ splash-icon.svg
│  ├─ splash-icon.png
│  └─ android/
│     ├─ adaptive-foreground.svg
│     ├─ adaptive-foreground.png
│     ├─ adaptive-background.svg
│     └─ adaptive-background.png
├─ web/
│  ├─ favicon-16.svg
│  └─ favicon-16.png
└─ categories/
   ├─ food.svg / food.png
   ├─ transport.svg / transport.png
   ├─ shopping.svg / shopping.png
   ├─ entertainment.svg / entertainment.png
   ├─ housing.svg / housing.png
   ├─ medical.svg / medical.png
   ├─ other.svg / other.png
   ├─ salary.svg / salary.png
   ├─ freelance.svg / freelance.png
   └─ investment.svg / investment.png
```

## 1. 品牌图标文件用途

| 文件 | 用途 | 建议 |
|---|---|---|
| `brand/app-icon.png` | **正式 App 主图标** | 手机桌面、iOS App Icon、应用商店展示等。若平台要求位图，优先使用 PNG。 |
| `brand/app-icon.svg` | App 主图标矢量母版 | 用于继续导出不同尺寸，不建议直接作为 iOS App Store 上传格式。 |
| `brand/android/adaptive-foreground.*` | Android Adaptive Icon 前景层 | 白色账单 + 人民币符号 + 勾选主体。与 background 配套使用。 |
| `brand/android/adaptive-background.*` | Android Adaptive Icon 背景层 | **1024×1024 满版矩形绿色背景，不带圆角。** 圆形、圆角方形等遮罩由 Android 系统处理。 |
| `brand/mono-icon.svg` | 单色品牌图标 | 系统单色图标、黑白打印、特殊 UI、Android monochrome/themed icon 等场景。 |
| `brand/mono-icon.png` | 单色图标位图预览/备用 | 不支持 SVG 的场景。 |
| `brand/splash-icon.*` | 启动页图标 | App Splash Screen / 启动画面中使用。它不是桌面 App Icon。 |
| `web/favicon-16.svg` | 16px Favicon 极简版 | 浏览器标签页等超小尺寸环境，已经减少内部细节。 |
| `web/favicon-16.png` | Favicon PNG 备用 | 兼容需要 PNG 的 Web/旧环境。 |

### 哪个才是正式 App 图标？

**`brand/app-icon.png` 就是 PureCash 的正式 App 图标。**

Android 如果采用 Adaptive Icon，则使用：

```text
前景：brand/android/adaptive-foreground
背景：brand/android/adaptive-background
```

不要给 `adaptive-background` 自己加圆角；Android Launcher 会根据设备主题自动裁切图标形状。

## 2. 分类图标文件用途

支出分类：

| Key | 含义 |
|---|---|
| `food` | 餐饮 |
| `transport` | 交通 |
| `shopping` | 购物 |
| `entertainment` | 娱乐 |
| `housing` | 居住 |
| `medical` | 医疗 |
| `other` | 其他 / 杂项 |

收入分类：

| Key | 含义 |
|---|---|
| `salary` | 工资 |
| `freelance` | 兼职 / 自由职业 |
| `investment` | 理财 / 投资收益 |
| `other` | 其他收入，与支出共用同一个 `other` 图标 |

`other.svg` 已从“三个圆点”调整为更能表达“杂项/收纳”的图形。

## 3. 分类 SVG 如何使用

所有分类 SVG：

- **不带背景**
- 单色设计
- 使用 `currentColor`
- 颜色由 App UI 控制
- 可直接适配浅色/深色模式

Web / Vue / React 中可以通过父元素 `color` 控制 SVG 颜色。例如：

```css
.category-icon {
  color: #07C160;
}

.dark .category-icon {
  color: #25D366;
}
```

如果你的框架把 SVG 当 `<img>` 加载，`currentColor` 不会继承页面颜色；此时建议把 SVG 作为 inline SVG / 组件导入，或者构建时替换颜色。

## 4. 推荐尺寸

分类图标：

- 16px：最小 UI 场景
- 18–20px：PureCash 当前分类列表推荐尺寸
- 40×40 圆形容器：图标本体建议约 18–20px

App Icon：

- 使用 SVG 母版导出平台要求的尺寸
- iOS / Android 商店与 Launcher 最终应按平台规范生成对应 PNG 资源

## 5. 颜色建议

```text
PureCash 主绿色：#07C160
深色主题绿色：#25D366
深色背景：#121212
深色卡片：#1E1E1E
支出红色：#E74C3C
```

分类图标不固定写死这些颜色，由 UI 状态决定。这样可以保证同一套 SVG 在浅色模式、深色模式、选中状态和禁用状态下复用。

## 6. 开发接入建议

### iOS
优先使用 `brand/app-icon.png` 作为视觉母版，再根据 Xcode Asset Catalog 要求导出各尺寸。启动页使用 `splash-icon`，不要直接拿 Splash 图标替代 App Icon。

### Android
如果使用 Adaptive Icon：

- foreground → `adaptive-foreground`
- background → `adaptive-background`

Background 是满版矩形，不包含圆角。

### Web / PWA
浏览器小图标优先使用 `web/favicon-16.svg`；需要 PNG 时使用 `favicon-16.png`。

### PureCash 分类 UI
建议优先使用 `categories/*.svg`，保持矢量清晰度，并通过 `currentColor` 统一控制颜色。

---

PureCash Icon System
设计方向：极简、清晰、可靠、轻量。
