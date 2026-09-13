PureCash 图标系统 - 文件用途说明
================================

【最重要】
正式 App 图标：brand/app-icon.png

一、品牌图标
------------
brand/app-icon.png / .svg
  PureCash 正式 App 主图标。用于手机桌面、应用商店展示等。

brand/android/adaptive-foreground.png / .svg
  Android Adaptive Icon 前景层：白色账单 + 人民币符号 + 勾选。

brand/android/adaptive-background.png / .svg
  Android Adaptive Icon 背景层。
  1024×1024 满版绿色矩形，不带圆角；圆角/圆形由 Android 系统遮罩处理。

brand/mono-icon.png / .svg
  黑白/单色品牌图标。用于系统单色图标、打印或特殊 UI。

brand/splash-icon.png / .svg
  App 启动页 Splash Screen 使用，不是手机桌面 App Icon。

web/favicon-16.png / .svg
  16px 浏览器 Favicon 极简版，已减少内部细节。

二、分类图标
------------
categories/food.svg          餐饮
categories/transport.svg     交通
categories/shopping.svg      购物
categories/entertainment.svg 娱乐
categories/housing.svg       居住
categories/medical.svg       医疗
categories/other.svg         其他/杂项（收入、支出共用）
categories/salary.svg        工资
categories/freelance.svg     兼职/自由职业
categories/investment.svg    理财/投资收益

分类 SVG 特性：
- 无背景
- 单色
- 使用 currentColor
- 颜色由 App UI 控制
- 支持浅色/深色主题复用

推荐尺寸：
- 16px：最小尺寸
- 18~20px：分类列表推荐
- 40×40 圆形容器：图标本体约 18~20px

主色：#07C160
深色主题绿：#25D366
深色背景：#121212
深色卡片：#1E1E1E
支出色：#E74C3C

详细接入说明请查看 README_使用说明.md
