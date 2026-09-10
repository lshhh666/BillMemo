const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 添加 wasm 文件支持
config.resolver.assetExts.push('wasm');

// expo-sqlite 在 Web 端依赖 SharedArrayBuffer，浏览器要求页面处于跨域隔离状态才会开放它
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
