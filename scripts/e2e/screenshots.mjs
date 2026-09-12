// 截图：空状态 → 记一笔 → 设预算后的首页卡
import { launchChrome, killChrome, connect, sleep } from './lib.mjs';

const appUrl = process.env.E2E_APP_URL ?? 'http://localhost:8082/';
const chrome = await launchChrome();
const ctx = await connect({ port: chrome.port });
try {
  await ctx.setViewport(420, 900);
  await ctx.navigate(appUrl);
  await ctx.waitText('还没有账单记录', 120000);
  await sleep(500);
  await ctx.shot('ui-01-empty-state');

  await ctx.clickLabel('记一笔');
  await ctx.waitText('选择分类');
  await ctx.clickText('8');
  await ctx.clickText('8');
  await ctx.clickText('保存');
  await ctx.clickText('首页');
  await ctx.waitText('-88.00');
  await ctx.shot('ui-02-no-budget');

  await ctx.clickText('我的');
  await ctx.waitText('月度预算');
  await ctx.typeIntoInput('input[placeholder*="预算"]', '1000');
  await ctx.clickText('保存');
  await sleep(800);
  await ctx.clickText('首页');
  await sleep(800);
  await ctx.shot('ui-03-with-budget');
  console.log('done');
} finally {
  ctx.close();
  killChrome(chrome);
}
