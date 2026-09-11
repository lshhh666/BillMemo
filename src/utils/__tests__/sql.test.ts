import { escapeLike } from '../sql';

describe('LIKE 关键词转义', () => {
  test('普通字符原样通过', () => {
    expect(escapeLike('餐饮')).toBe('餐饮');
    expect(escapeLike('coffee')).toBe('coffee');
  });

  test('通配符被转义', () => {
    expect(escapeLike('%')).toBe('\\%');
    expect(escapeLike('_')).toBe('\\_');
    expect(escapeLike('100%')).toBe('100\\%');
  });

  test('转义符本身也被转义', () => {
    expect(escapeLike('\\')).toBe('\\\\');
  });
});
