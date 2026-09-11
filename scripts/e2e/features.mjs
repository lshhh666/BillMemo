// 编辑记录、搜索通配符、备份下载、从备份恢复
import fs from 'node:fs';
import path from 'node:path';
import { expect, sleep } from './lib.mjs';

export const name = '编辑 / 备份 / 恢复';

export async function run(ctx, { appUrl, downloadDir }) {
  await ctx.setViewport(420, 900);
  await ctx.navigate(appUrl);
  await ctx.waitText('还没有账单记录', 120000);

  console.log('   记一笔 88');
  await ctx.clickText('记账');
  await ctx.waitText('选择分类');
  await ctx.clickText('8');
  await ctx.clickText('8');
  await ctx.clickText('保存');
  await ctx.clickText('首页');
  await ctx.waitText('-88.00');

  console.log('   点击记录进入编辑，切换类型金额应保留，改成 85');
  await ctx.clickText('餐饮');
  await ctx.waitText('编辑记录');
  const amountShown = () =>
    ctx.evalJs(`[...document.querySelectorAll('div')]
      .filter(e => e.childElementCount === 0 && parseFloat(getComputedStyle(e).fontSize) >= 40 && /^\\d/.test(e.textContent.trim()))
      .map(e => e.textContent.trim())[0]`);
  expect((await amountShown()) === '88', '编辑页应预填金额 88');
  await ctx.shot('features-01-edit-mode');
  await ctx.clickText('收入');
  expect((await amountShown()) === '88', '切到收入后金额应保留为 88');
  await ctx.clickText('支出');
  expect((await amountShown()) === '88', '切回支出后金额应保留为 88');
  await ctx.clickText('⌫');
  await ctx.clickText('5');
  await ctx.clickText('保存修改');
  const homeAfterEdit = await ctx.waitText('-85.00');
  expect(!homeAfterEdit.includes('-88.00'), '编辑后旧金额 88 不应再出现');

  console.log('   搜索关键词里的 % 应按字面匹配');
  const openSearch = () =>
    ctx.clickSiblingOf(
      `e => e.textContent.trim() === '账单' && parseFloat(getComputedStyle(e).fontSize) > 20`,
      'nextElementSibling',
    );
  await openSearch();
  await ctx.typeIntoInput('input[placeholder*="搜索"]', '%');
  await sleep(600);
  expect((await ctx.bodyText()).includes('没有找到匹配的记录'), '搜索 % 不应匹配到任何记录');
  await ctx.clickText('取消');
  await openSearch();
  await ctx.typeIntoInput('input[placeholder*="搜索"]', '85');
  const searchText = (await ctx.waitText('找到记录')).replace(/\n+/g, ' ');
  expect(/找到记录\s*1 笔/.test(searchText), '搜索 85 应找到 1 笔');
  await ctx.clickText('取消');

  console.log('   备份：应下载 JSON 文件');
  await ctx.clickText('我的');
  await ctx.waitText('备份全部数据');
  for (const f of fs.readdirSync(downloadDir)) fs.unlinkSync(path.join(downloadDir, f));
  await ctx.clickText('备份全部数据');
  let backupPath = null;
  for (let i = 0; i < 30 && !backupPath; i++) {
    const found = fs.readdirSync(downloadDir).find((n) => n.endsWith('.json'));
    if (found) backupPath = path.join(downloadDir, found);
    else await sleep(500);
  }
  expect(backupPath, '点击「备份全部数据」后应下载 JSON 文件');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  expect(
    backup.app === 'PureCash' && backup.transactions.length === 1 && backup.transactions[0].amount === 85,
    '备份内容应为 1 笔 85 元的记录',
  );

  console.log('   再记一笔 66 制造差异，然后从备份恢复');
  await ctx.clickText('记账');
  await ctx.waitText('选择分类');
  await ctx.clickText('6');
  await ctx.clickText('6');
  await ctx.clickText('保存');
  await ctx.clickText('首页');
  await ctx.waitText('-66.00');
  await ctx.clickText('我的');
  await ctx.waitText('从备份恢复');
  ctx.nextFile = backupPath;
  ctx.acceptConfirm = /恢复会覆盖/;
  await ctx.clickText('从备份恢复');
  await sleep(2500);
  const doneDialog = ctx.dialogs.find((d) => d.message.includes('已恢复'));
  expect(doneDialog?.message.includes('已恢复 1 笔账单'), '恢复完成提示应为「已恢复 1 笔账单」');
  await ctx.clickText('首页');
  await sleep(800);
  const homeAfterRestore = await ctx.bodyText();
  expect(
    homeAfterRestore.includes('-85.00') && !homeAfterRestore.includes('-66.00'),
    '恢复后应只剩备份里的 85，之后记的 66 应消失',
  );
  await ctx.shot('features-02-after-restore');
}
