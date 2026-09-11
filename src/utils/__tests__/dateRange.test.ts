import 'dayjs/locale/zh-cn.js';
import dayjs from 'dayjs';
import { monthRange, weekRange, weekComparisonAnchor } from '../dateRange';

dayjs.locale('zh-cn');

describe('monthRange', () => {
  test('包含起止两端的整月', () => {
    expect(monthRange(dayjs('2026-09-15'))).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  test('闰年二月', () => {
    expect(monthRange(dayjs('2024-02-10'))).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange(dayjs('2025-02-10'))).toEqual({ start: '2025-02-01', end: '2025-02-28' });
  });
});

describe('weekRange', () => {
  test('zh-cn 下周一起始、周日结束', () => {
    // 2026-09-10 是周四，所在周应为 09-07（周一）到 09-13（周日）
    expect(weekRange(dayjs('2026-09-10'))).toEqual({ start: '2026-09-07', end: '2026-09-13' });
  });

  test('跨月的一周', () => {
    // 2026-08-31 是周一，所在周跨到 9 月
    expect(weekRange(dayjs('2026-08-31'))).toEqual({ start: '2026-08-31', end: '2026-09-06' });
  });
});

describe('weekComparisonAnchor', () => {
  const today = dayjs('2026-09-10');

  test('查看当月时以今天为基准', () => {
    expect(weekComparisonAnchor(dayjs('2026-09-01'), today).format('YYYY-MM-DD')).toBe('2026-09-10');
  });

  test('查看历史月份时以该月最后一天为基准', () => {
    expect(weekComparisonAnchor(dayjs('2026-08-01'), today).format('YYYY-MM-DD')).toBe('2026-08-31');
    expect(weekComparisonAnchor(dayjs('2026-02-01'), today).format('YYYY-MM-DD')).toBe('2026-02-28');
  });
});
