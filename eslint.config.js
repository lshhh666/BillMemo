// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // scripts/ 下是独立的 Node 工具（Web 预览代理、E2E），不属于应用代码
    ignores: ['node_modules/', 'scripts/**', 'dist/', 'web-build/'],
  },
]);
