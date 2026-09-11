/** 把用户输入转成可安全放进 LIKE 的字面模式，需配合 `ESCAPE '\'` 使用 */
export function escapeLike(keyword: string): string {
  return keyword.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
