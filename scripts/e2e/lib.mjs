// Web 端 E2E 的共享工具：启停无头 Chrome、通过 DevTools 协议驱动页面
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPORT_DIR = path.join(E2E_DIR, 'reports');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function expect(condition, message) {
  if (!condition) throw new Error(`断言失败：${message}`);
}

export function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates =
    process.platform === 'win32'
      ? [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
          'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        ]
      : process.platform === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          ]
        : ['google-chrome', 'chromium', 'chromium-browser'];
  for (const candidate of candidates) {
    if (candidate.includes('/')) {
      if (fs.existsSync(candidate)) return candidate;
    } else if (spawnSync('which', [candidate], { stdio: 'ignore' }).status === 0) {
      return candidate;
    }
  }
  return null;
}

/**
 * 启动无头 Chrome，调试端口由系统随机分配（--remote-debugging-port=0），
 * 从配置目录的 DevToolsActivePort 文件读回实际端口。
 * 不用固定端口：固定端口会被上一轮遗留的实例占住，新实例绑不上端口却照常运行，
 * 测试就会一直操作旧页面（表现为"莫名加载旧版本代码"）。
 */
export async function launchChrome({ width = 420, height = 900 } = {}) {
  const exe = findChrome();
  if (!exe) throw new Error('没有找到 Chrome / Edge，可通过环境变量 CHROME_PATH 指定可执行文件路径');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'purecash-e2e-'));
  const child = spawn(
    exe,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 60; i++) {
    try {
      const content = fs.readFileSync(portFile, 'utf8').trim();
      const port = Number(content.split('\n')[0]);
      if (port > 0) {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (res.ok) return { child, profile, port };
      }
    } catch {}
    await sleep(500);
  }
  killChrome({ child, profile });
  throw new Error(`无头 Chrome 启动超时（exitCode=${child.exitCode}）`);
}

export function killChrome({ child, profile }) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGKILL');
  }
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {}
}

/**
 * 连接到无头 Chrome 的第一个页面，返回一组驱动页面的方法。
 * 页面里的 window.alert / confirm 会阻塞脚本，这里统一自动应答：
 * alert 直接关闭；confirm 默认取消，除非消息匹配 ctx.acceptConfirm。
 */
export async function connect({ port, downloadDir, log = console.log }) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('无头 Chrome 里没有可用页面');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let seq = 0;
  const pending = new Map();
  const ctx = {
    dialogs: [],
    acceptConfirm: null,
    nextFile: null,
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Page.javascriptDialogOpening') {
      const { type, message } = msg.params;
      const flat = message.replace(/\n+/g, ' / ');
      ctx.dialogs.push({ type, message });
      log(`   [对话框 ${type}] ${flat}`);
      const accept = type !== 'confirm' || (ctx.acceptConfirm ? ctx.acceptConfirm.test(message) : false);
      ws.send(JSON.stringify({ id: ++seq, method: 'Page.handleJavaScriptDialog', params: { accept } }));
    } else if (msg.method === 'Page.fileChooserOpened' && ctx.nextFile) {
      log(`   [文件选择框] 注入 ${path.basename(ctx.nextFile)}`);
      ws.send(
        JSON.stringify({
          id: ++seq,
          method: 'DOM.setFileInputFiles',
          params: { files: [ctx.nextFile], backendNodeId: msg.params.backendNodeId },
        }),
      );
      ctx.nextFile = null;
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (msg) =>
        msg.error ? reject(new Error(`${method}: ${JSON.stringify(msg.error)}`)) : resolve(msg.result),
      );
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evalJs = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  };

  const bodyText = () => evalJs('document.body ? document.body.innerText : ""');

  const waitText = async (needle, timeoutMs = 60000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const text = await bodyText();
      if (text && text.includes(needle)) return text;
      await sleep(800);
    }
    throw new Error(`等待文本超时：「${needle}」\n当前页面：${(await bodyText()).slice(0, 400)}`);
  };

  const clickAt = async ({ x, y }) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
    await sleep(600);
  };

  // 点击文本精确匹配、且确实位于最上层的元素。同名元素取字号最小的（键盘按键 vs 金额显示区），
  // 并用 elementFromPoint 排除被隐藏 tab 页遮住的同名元素。
  const locateText = (text) =>
    evalJs(`(() => {
      const cands = [...document.querySelectorAll('div,span,a,button')]
        .filter(e => e.childElementCount === 0 && e.textContent.trim() === ${JSON.stringify(text)} && e.getBoundingClientRect().width > 0)
        .sort((a, b) => parseFloat(getComputedStyle(a).fontSize) - parseFloat(getComputedStyle(b).fontSize));
      for (const el of cands) {
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2, y = r.y + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === el || el.contains(hit) || hit.contains(el))) return { x, y };
      }
      return null;
    })()`);

  const clickText = async (text) => {
    const point = await locateText(text);
    if (!point) throw new Error(`找不到可点击的文本：「${text}」`);
    await clickAt(point);
  };

  // 点击某段文本旁边的兄弟元素（用于图标按钮：如标题右侧的搜索图标、月份两侧的箭头）
  const clickSiblingOf = async (matcher, which) => {
    const point = await evalJs(`(() => {
      const el = [...document.querySelectorAll('div')].find(e => e.childElementCount === 0 && (${matcher})(e));
      const sib = el && el[${JSON.stringify(which)}]; if (!sib) return null;
      sib.scrollIntoView({ block: 'center' });
      const r = sib.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!point) throw new Error('找不到目标旁的兄弟元素');
    await clickAt(point);
  };

  const typeIntoInput = async (selector, text) => {
    const ok = await evalJs(`(() => { const i = document.querySelector(${JSON.stringify(selector)}); if (!i) return false; i.focus(); return true; })()`);
    if (!ok) throw new Error(`找不到输入框：${selector}`);
    await send('Input.insertText', { text });
    await sleep(500);
  };

  // 点击带 aria-label 的元素（纯图标按钮，如右下角的 "+"）
  const clickLabel = async (label) => {
    const result = await evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(`[aria-label="${label}"]`)});
      if (!el) {
        const labels = [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label'));
        return { missing: true, labels };
      }
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit) || hit.contains(el))) return { x, y };
      return { blocked: true, hit: hit ? hit.tagName + ' "' + (hit.textContent || '').trim().slice(0, 20) + '"' : 'none' };
    })()`);
    if (!result || result.missing) {
      throw new Error(`找不到带 aria-label 的元素：「${label}」，页面上现有的标签：${JSON.stringify(result?.labels ?? [])}`);
    }
    if (result.blocked) {
      throw new Error(`aria-label「${label}」的元素被遮挡（挡住它的是 ${result.hit}）`);
    }
    await clickAt(result);
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(REPORT_DIR, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    log(`   截图 → reports/${name}.png`);
  };

  const setViewport = (width, height, mobile = true) =>
    send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });

  const navigate = async (url) => {
    await send('Page.navigate', { url });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Page.setInterceptFileChooserDialog', { enabled: true });
  if (downloadDir) {
    fs.mkdirSync(downloadDir, { recursive: true });
    try {
      await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, eventsEnabled: true });
    } catch {
      await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });
    }
  }

  return Object.assign(ctx, {
    send,
    evalJs,
    bodyText,
    waitText,
    clickAt,
    clickText,
    locateText,
    clickLabel,
    clickSiblingOf,
    typeIntoInput,
    shot,
    setViewport,
    navigate,
    close: () => ws.close(),
  });
}
