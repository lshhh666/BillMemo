import { rankCategories } from '../categoryRanking';

const cats = [
  { name: '餐饮', sort_order: 0, icon: '1' },
  { name: '交通', sort_order: 1, icon: '2' },
  { name: '购物', sort_order: 2, icon: '3' },
  { name: '医疗', sort_order: 5, icon: '4' },
];

describe('rankCategories 常用分类排序', () => {
  test('无使用记录时保持原顺序', () => {
    expect(rankCategories(cats, {}).map((c) => c.name)).toEqual(['餐饮', '交通', '购物', '医疗']);
  });

  test('按使用次数降序', () => {
    const usage = { 交通: 5, 医疗: 2 };
    expect(rankCategories(cats, usage).map((c) => c.name)).toEqual([
      '交通',
      '医疗',
      '餐饮',
      '购物',
    ]);
  });

  test('次数相同时按原 sort_order 决胜负', () => {
    const usage = { 医疗: 3, 购物: 3 };
    expect(rankCategories(cats, usage).map((c) => c.name)).toEqual([
      '购物',
      '医疗',
      '餐饮',
      '交通',
    ]);
  });

  test('不修改传入的数组', () => {
    const original = [...cats];
    rankCategories(cats, { 医疗: 9 });
    expect(cats).toEqual(original);
  });

  test('usage 里存在未知分类时不影响结果', () => {
    const usage = { 不存在的分类: 100, 交通: 1 };
    expect(rankCategories(cats, usage).map((c) => c.name)).toEqual([
      '交通',
      '餐饮',
      '购物',
      '医疗',
    ]);
  });
});
