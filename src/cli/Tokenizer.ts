/**
 * 分词结果：值 + 是否来自双引号。
 * `quoted` 用于区分 `create text t1 20 40 "in"`（文本内容）与 `... in g1`（in 子句）。
 */
export interface Token {
  readonly value: string;
  readonly quoted: boolean;
}

/**
 * 按空白分词；双引号内保留空格与原样内容（不处理转义）。
 * 未闭合的引号按「到行尾为内容」处理，不报错。
 */
export class Tokenizer {
  public tokenize(line: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < line.length) {
      if (/\s/.test(line[i] as string)) {
        i++;
        continue;
      }
      if (line[i] === '"') {
        i++;
        let value = '';
        while (i < line.length && line[i] !== '"') {
          value += line[i];
          i++;
        }
        if (i < line.length) i++; // 跳过闭合引号
        tokens.push({ value, quoted: true });
        continue;
      }
      let value = '';
      while (i < line.length && !/\s/.test(line[i] as string)) {
        value += line[i];
        i++;
      }
      tokens.push({ value, quoted: false });
    }
    return tokens;
  }
}
