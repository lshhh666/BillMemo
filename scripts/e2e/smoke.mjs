// 基础流程：记账、选日期、搜索、统计、深色模式持久化、检查更新提示、桌面宽度布局
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn.js';
import { expect, sleep } from './lib.mjs';

dayjs.locale('zh-cn');

export const name = '基础流程';

export async function run(ctx, { appUrl }) {
  const today = dayjs();
  const yesterday = today.subtract(1, 'day');
  const dayLabel = (d) => d.format('M月D日 dddd');

  await ctx.setViewport(420, 900);
  await ctx.navigate(appUrl);
  await ctx.waitText('还没有账单记录', 120000);
  expect(await ctx.evalJs('globalThis.crossOriginIsolated === true'), '页面应处于跨域隔离状态（SharedArrayBuffer 可用）');
  await ctx.shot('smoke-01-home-empty');

  console.log('   记一笔 88（今天）');
  await ctx.clickLabel('记一笔');
  await ctx.waitText('选择分类');
  await ctx.clickText('8');
  await ctx.clickText('8');
  await ctx.clickText('保存');
  await ctx.waitText('已记支出', 5000).catch(() => {}); // toast 稍纵即逝，能捕捉到最好
  const homeAfterFirst = await ctx.waitText('-88.00');
  expect(homeAfterFirst.includes(dayLabel(today)), `首页应显示中文星期的日期标签「${dayLabel(today)}」`);

  console.log('   通过日期选择器选「昨天」再记一笔');
  await ctx.clickLabel('记一笔');
  await ctx.waitText('选择分类');
  const dateChip = await ctx.evalJs(`(() => {
    // 弹层日期芯片的完整文字是「9月13日（今天）」，全串匹配，避免撞上首页的「9月13日 星期日」
    const el = [...document.querySelectorAll('div')].find(e => e.childElementCount === 0 && /^\\d{1,2}月\\d{1,2}日(（今天）)?$/.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0);
    if (!el) return null; el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (!hit || (hit !== el && !el.contains(hit) && !hit.contains(el))) return null;
    return { x, y };
  })()`);
  expect(dateChip, '弹层里应有日期行');
  await ctx.clickAt(dateChip);
  await ctx.waitText('选择日期');
  await sleep(600);
  await ctx.shot('smoke-02-date-picker');
  await ctx.clickText('昨天');
  await sleep(400);
  expect((await ctx.bodyText()).includes(yesterday.format('M月D日')), '选择「昨天」后日期行应显示昨天的日期');
  await ctx.clickText('8');
  await ctx.clickText('8');
  await ctx.clickText('保存');
  const homeAfterSecond = await ctx.waitText(dayLabel(yesterday));
  expect(homeAfterSecond.includes(dayLabel(today)), '首页应同时显示今天和昨天两组记录');
  await ctx.shot('smoke-03-home-two-days');

  console.log('   搜索 88');
  await ctx.clickSiblingOf(
    `e => e.textContent.trim() === '账单' && parseFloat(getComputedStyle(e).fontSize) > 20`,
    'nextElementSibling',
  );
  await ctx.typeIntoInput('input[placeholder*="搜索"]', '88');
  const searchText = (await ctx.waitText('找到记录')).replace(/\n+/g, ' ');
  expect(/找到记录\s*2 笔/.test(searchText), `搜索 88 应找到 2 笔，实际：${searchText.match(/找到记录\s*\d+ 笔/)?.[0]}`);
  await ctx.shot('smoke-04-search');
  await ctx.clickText('取消');

  console.log('   统计页：单分类饼图应为整圆');
  await ctx.clickText('统计');
  await ctx.waitText('支出分类分布');
  await sleep(600);
  expect(await ctx.evalJs(`!!document.querySelector('svg circle')`), '只有一个支出分类时饼图应以整圆绘制');
  await ctx.shot('smoke-05-statistics');

  console.log('   翻到上个月：周趋势区间应跟随月份');
  await ctx.clickSiblingOf(
    `e => /^\\d{4}年\\d{1,2}月$/.test(e.textContent.trim()) && e.previousElementSibling && e.nextElementSibling`,
    'previousElementSibling',
  );
  const prevMonth = today.subtract(1, 'month');
  await ctx.waitText(prevMonth.format('YYYY年M月'));
  const anchor = prevMonth.endOf('month');
  const lastWeek = anchor.subtract(1, 'week');
  const expectedRange = `${anchor.startOf('week').format('M/D')} - ${anchor.endOf('week').format('M/D')} vs ${lastWeek.startOf('week').format('M/D')} - ${lastWeek.endOf('week').format('M/D')}`;
  expect((await ctx.bodyText()).includes(expectedRange), `上月周趋势区间应为「${expectedRange}」`);

  console.log('   深色模式开启后刷新应保持');
  await ctx.clickText('我的');
  await ctx.waitText('深色模式');
  await ctx.clickText('深色模式');
  await sleep(500);
  const cardBackground = () =>
    ctx.evalJs(`(() => {
      let el = [...document.querySelectorAll('div')].find(e => e.childElementCount === 0 && e.textContent.trim() === '深色模式');
      for (let i = 0; i < 6 && el; i++) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') return bg;
        el = el.parentElement;
      }
      return null;
    })()`);
  const darkBg = await cardBackground();
  expect(darkBg === 'rgb(30, 30, 30)', `开启深色模式后卡片背景应为 rgb(30, 30, 30)，实际 ${darkBg}`);
  await ctx.send('Page.reload');
  await sleep(1500);
  await ctx.waitText('深色模式');
  await sleep(500);
  const bgAfterReload = await cardBackground();
  expect(bgAfterReload === 'rgb(30, 30, 30)', `刷新后应保持深色，实际 ${bgAfterReload}`);
  await ctx.shot('smoke-06-dark-after-reload');

  console.log('   开发模式点「检查更新」应给出提示');
  await ctx.clickText('检查更新');
  await sleep(500);
  const updateDialog = ctx.dialogs.find((d) => d.message.includes('检查更新'));
  expect(updateDialog?.message.includes('开发模式下不支持检查更新'), '应弹出「开发模式下不支持检查更新」提示');

  console.log('   桌面宽度下键盘仍为 3 列且居中');
  await ctx.setViewport(1280, 800, false);
  await ctx.clickText('首页'); // "+" 在首页上，非活动 tab 的内容不在 DOM 里，先回首页
  await ctx.clickLabel('记一笔');
  await ctx.waitText('选择分类');
  await sleep(400);
  const keys = await ctx.evalJs(`[...document.querySelectorAll('div')]
    .filter(e => e.childElementCount === 0 && ['1','2','3'].includes(e.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 30)
    .map(e => { const r = e.getBoundingClientRect(); return { key: e.textContent.trim(), x: r.x + r.width / 2, y: Math.round(r.y) }; })`);
  expect(keys.length === 3, `桌面宽度下应同时看到 1、2、3 三个键，实际 ${keys.length} 个`);
  expect(
    keys.every((k) => Math.abs(k.x - 640) < 240) && new Set(keys.map((k) => k.y)).size === 1,
    '1、2、3 应在同一行并位于居中的手机宽度区域内',
  );
  await ctx.shot('smoke-07-desktop-width');
}
