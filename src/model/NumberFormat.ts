/**
 * 数字解析与稳定格式化：
 * - 内部一律 number；CLI 参数用严格解析，非法抛 DomainError
 * - 读入外部 SVG 时用宽松解析（允许 '10px' 这类带单位值，取数值部分）
 * - 输出统一 format()：最多 6 位小数、去掉尾随 0、-0 归一为 0
 */
export class NumberFormat {
  /** 严格解析：纯数字字符串，失败抛 DomainError。 */
  static parseStrict(token: string): number {
    const trimmed = token.trim();
    if (trimmed.length === 0) {
      throw new Error('empty number token');
    }
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new Error(`invalid number: ${token}`);
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      throw new Error(`invalid number: ${token}`);
    }
    return n;
  }

  /** 宽松解析：允许 '10px' / '50%' / '0.5em' 等，取开头数值部分；缺省 0。 */
  static parseLenient(raw: string): number {
    const m = raw.trim().match(/^-?\d+(\.\d+)?/);
    if (!m) return 0;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : 0;
  }

  /** 稳定输出字符串：最多 6 位小数、去尾随 0、-0 → '0'。 */
  static format(n: number): string {
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    const sign = n < 0 && abs > 0 ? '-' : '';
    if (abs === 0) return '0';
    let str = abs.toFixed(6);
    str = str.replace(/0+$/, '').replace(/\.$/, '');
    return sign + str;
  }
}
