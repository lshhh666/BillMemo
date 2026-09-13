// 截图：新交互——底部记账弹层、中央 + 按钮
import { launchChrome, killChrome, connect, sleep } from './lib.mjs';

const appUrl = process.env.E2E_APP_URL ?? 'http://localhost:8082/';
const chrome = await launchChrome();
const ctx = await connect({ port: chrome.port });
try {
  await ctx.setViewport(420, 900);
  await ctx.navigate(appUrl);
  await ctx.waitText('还没有账单记录', 120000);
  await sleep(400);
  await ctx.shot('sheet-01-home-fab');

  await ctx.clickLabel('记一笔');
  await ctx.waitText('选择分类');
  await sleep(600);
  await ctx.shot('sheet-02-open');

  await ctx.clickText('8');
  await ctx.clickText('8');
  await ctx.clickText('保存');
  await sleep(700);
  await ctx.shot('sheet-03-after-save');
  console.log('done');
} finally {
  ctx.close();
  killChrome(chrome);
}
