// 品牌图标选型板：用 SVG 代码精确绘制若干候选，渲染成对比图
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launchChrome, killChrome, connect, sleep, REPORT_DIR } from './lib.mjs';

// 每个候选是一段 SVG（viewBox 512），¥ 用系统字体粗体渲染
const tile = (bg, fg, opts = {}) => {
  const { ring = false, grad = false, radius = 118 } = opts;
  const fill = grad
    ? `<defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#059657"/><stop offset="1" stop-color="#0ABF6B"/></linearGradient></defs><rect width="512" height="512" rx="${radius}" fill="url(#g)"/>`
    : `<rect width="512" height="512" rx="${radius}" fill="${bg}"/>`;
  const ringEl = ring
    ? `<circle cx="256" cy="256" r="188" fill="none" stroke="${fg}" stroke-width="34"/>`
    : '';
  const inner = ring ? 'font-size="190"' : 'font-size="290"';
  return `<svg width="220" height="220" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    ${fill}${ringEl}
    <text x="256" y="58%" text-anchor="middle" dominant-baseline="middle" ${inner}
      font-family="'Segoe UI','Microsoft YaHei',sans-serif" font-weight="700" fill="${fg}">¥</text>
  </svg>`;
};

const variants = [
  { name: 'V1 绿底白字', svg: tile('#07C160', '#FFFFFF') },
  { name: 'V2 深绿渐变白字', svg: tile('', '#FFFFFF', { grad: true }) },
  { name: 'V3 白底绿字', svg: tile('#FFFFFF', '#07C160') },
  { name: 'V4 白底绿环绿字', svg: tile('#FFFFFF', '#07C160', { ring: true }) },
  { name: 'V5 绿底白环白字', svg: tile('#07C160', '#FFFFFF', { ring: true }) },
  { name: 'V6 墨黑底绿字', svg: tile('#1B1F1D', '#07C160') },
  { name: 'V7 超大圆角绿底白字', svg: tile('#07C160', '#FFFFFF', { radius: 150 }) },
  { name: 'V8 浅绿底深绿字', svg: tile('#DFF6E9', '#059657') },
];

const small = (i) =>
  `<div style="text-align:center">${variants[i].svg.replace('width="220" height="220"', 'width="48" height="48"')}<div style="font:11px system-ui;color:#888;margin-top:2px">V${i + 1}</div></div>`;

const html = `<!doctype html><html><body style="margin:0;background:#F2F3F5;padding:24px;font-family:system-ui">
<div style="font:600 18px system-ui;color:#333;margin-bottom:16px">PureCash 图标候选（点击率测试：下面一行是缩到 48px 的效果）</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:1000px">
  ${variants.map((v, i) => `<div style="text-align:center">
    <div style="display:inline-block;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">${v.svg}</div>
    <div style="font:13px system-ui;color:#333;margin-top:6px">${v.name}</div>
  </div>`).join('')}
</div>
<div style="display:flex;gap:20px;margin-top:22px;padding:14px 16px;background:#fff;border-radius:12px;max-width:1000px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
  ${variants.map((_, i) => small(i)).join('')}
</div>
</body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(8092, r));

const chrome = await launchChrome({ width: 1060, height: 780 });
const ctx = await connect({ port: chrome.port });
try {
  await ctx.navigate('http://127.0.0.1:8092/');
  await sleep(500);
  const shot = await ctx.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'icon-board.png'), Buffer.from(shot.data, 'base64'));
  console.log('选型板 → reports/icon-board.png');
} finally {
  ctx.close();
  killChrome(chrome);
  server.close();
}
