/**
 * 常用分类排序：按使用次数从多到少排，次数相同（含都是 0）时保持原有 sort_order。
 * 排序只依据传入的 usage 统计，函数本身无副作用，便于单测。
 */
export interface RankableCategory {
  name: string;
  sort_order: number;
}

export function rankCategories<T extends RankableCategory>(
  categories: T[],
  usage: Record<string, number>,
): T[] {
  return [...categories].sort((a, b) => {
    const usageA = usage[a.name] ?? 0;
    const usageB = usage[b.name] ?? 0;
    if (usageA !== usageB) return usageB - usageA;
    return a.sort_order - b.sort_order;
  });
}
