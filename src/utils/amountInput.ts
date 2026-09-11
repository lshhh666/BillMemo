export const MAX_AMOUNT = 999999999.99;
export const BACKSPACE_KEY = '⌫';

/**
 * 金额键盘的输入规则。返回按下 key 之后的金额字符串；输入被拒绝时原样返回。
 * - 显示值始终是合法的数字前缀：无多余前导零、至多一个小数点、小数至多两位
 * - 上限 999999999.99
 */
export function applyAmountKey(amount: string, key: string): string {
  if (key === BACKSPACE_KEY) {
    return amount.slice(0, -1) || '0';
  }

  const base = amount === '0' ? '' : amount;

  if (key === '.') {
    if (base.includes('.')) return amount;
    return (base === '' ? '0' : base) + '.';
  }

  const next = base + key;

  const dotIndex = next.indexOf('.');
  if (dotIndex !== -1 && next.length - dotIndex > 3) return amount;

  if (parseFloat(next) > MAX_AMOUNT) return amount;

  return next;
}
