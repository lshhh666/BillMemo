import dayjs, { type Dayjs } from 'dayjs';

export interface DateRange {
  /** YYYY-MM-DD，含 */
  start: string;
  /** YYYY-MM-DD，含 */
  end: string;
}

const FORMAT = 'YYYY-MM-DD';

export function monthRange(day: Dayjs = dayjs()): DateRange {
  return { start: day.startOf('month').format(FORMAT), end: day.endOf('month').format(FORMAT) };
}

/** 周的起止日跟随 dayjs 当前 locale（zh-cn 为周一起始） */
export function weekRange(day: Dayjs): DateRange {
  return { start: day.startOf('week').format(FORMAT), end: day.endOf('week').format(FORMAT) };
}

/** 周趋势的基准日：查看当月时用今天，查看历史月份时用该月最后一天 */
export function weekComparisonAnchor(selectedMonth: Dayjs, today: Dayjs = dayjs()): Dayjs {
  return selectedMonth.isSame(today, 'month') ? today : selectedMonth.endOf('month');
}
