/**
 * Web 预览代理
 *
 * expo-sqlite 在浏览器里使用同步 API 依赖 SharedArrayBuffer，而浏览器只在页面处于
 * 跨域隔离状态（响应带 COOP/COEP 头）时才开放它。Expo CLI 的 enhanceMiddleware 只能
 * 给 Metro 的 bundle 请求加头，首页 HTML 由 CLI 自己的中间件返回、加不上，因此这里
 * 用一个极简反向代理统一补头，并透传 WebSocket 以保留热更新。
 *
 * 用法：先 `npx expo start --port 8081`，再 `node scripts/web-preview.js`，
 * 然后在浏览器打开 http://localhost:8082
 */
const http = require('http');
const net = require('net');

const UPSTREAM_HOST = '127.0.0.1';
const UPSTREAM_PORT = Number(process.env.EXPO_PORT || 8081);
const LISTEN_PORT = Number(process.env.PREVIEW_PORT || 8082);

const ISOLATION_HEADERS = {
  'cross-origin-embedder-policy': 'credentialless',
  'cross-origin-opener-policy': 'same-origin',
};

const server = http.createServer((req, res) => {
  const upstreamReq = http.request(
    {
      host: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, {
        ...upstreamRes.headers,
        ...ISOLATION_HEADERS,
      });
      upstreamRes.pipe(res);
    },
  );

  upstreamReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`无法连接到 Expo 开发服务器 (${UPSTREAM_HOST}:${UPSTREAM_PORT})：${err.message}`);
  });

  req.pipe(upstreamReq);
});

// Metro 的热更新走 WebSocket，需要把 upgrade 请求原样转发给上游
server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(UPSTREAM_PORT, UPSTREAM_HOST, () => {
    let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    }
    raw += '\r\n';
    upstream.write(raw);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(LISTEN_PORT, () => {
  console.log(`Web 预览地址: http://localhost:${LISTEN_PORT}  (代理到 ${UPSTREAM_HOST}:${UPSTREAM_PORT})`);
});
