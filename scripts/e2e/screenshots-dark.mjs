// 补充截图：深色模式 + 超支状态的首页预算卡
import { launchChrome, killChrome, connect, sleep } from './lib.mjs';

const appUrl = process.env.E2E_APP_URL ?? 'http://localhost:8082/';
const chrome = await launchChrome();
const ctx = await connect({ port: chrome.port });
try {
  await ctx.setViewport(420, 900);
  await ctx.navigate(appUrl);
  await ctx.waitText('还没有账单记录', 120000);

  await ctx.clickLabel('记一笔');
  await ctx.waitText('选择分类');
  await ctx.clickText('8');
  await ctx.clickText('8');
  await ctx.clickText('保存');
  await ctx.clickText('我的');
  await ctx.waitText('月度预算');
  await ctx.typeIntoInput('input[placeholder*="预算"]', '50'); // 支出 88 > 50，制造超支
  await ctx.clickText('保存');
  await sleep(800);
  await ctx.clickText('深色模式');
  await sleep(600);
  await ctx.clickText('首页');
  await sleep(800);
  await ctx.shot('ui-04-over-budget-dark');
  console.log('done');
} finally {
  ctx.close();
  killChrome(chrome);
}
