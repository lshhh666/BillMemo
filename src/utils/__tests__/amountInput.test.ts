import { applyAmountKey, BACKSPACE_KEY } from '../amountInput';

describe('金额键盘输入规则', () => {
  test('首位数字替换默认的 0', () => {
    expect(applyAmountKey('0', '5')).toBe('5');
  });

  test('连续输入数字', () => {
    expect(applyAmountKey('8', '8')).toBe('88');
  });

  test('再按 0 仍保持 0', () => {
    expect(applyAmountKey('0', '0')).toBe('0');
  });

  test('小数点：以 0 起头', () => {
    expect(applyAmountKey('0', '.')).toBe('0.');
  });

  test('小数点：只允许一个', () => {
    expect(applyAmountKey('5.', '.')).toBe('5.');
    expect(applyAmountKey('5.2', '.')).toBe('5.2');
  });

  test('小数位最多两位', () => {
    expect(applyAmountKey('5.1', '2')).toBe('5.12');
    expect(applyAmountKey('5.12', '3')).toBe('5.12');
  });

  test('超过上限拒绝输入', () => {
    expect(applyAmountKey('999999999', '9')).toBe('999999999');
    expect(applyAmountKey('99999999', '9')).toBe('999999999');
  });

  test('退格：删到空回到 0', () => {
    expect(applyAmountKey('5', BACKSPACE_KEY)).toBe('0');
    expect(applyAmountKey('0', BACKSPACE_KEY)).toBe('0');
    expect(applyAmountKey('5.12', BACKSPACE_KEY)).toBe('5.1');
    expect(applyAmountKey('5.', BACKSPACE_KEY)).toBe('5');
  });
});
