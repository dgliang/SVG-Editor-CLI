import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/cli/Tokenizer';

const tokenizer = new Tokenizer();

describe('Tokenizer', () => {
  it('空串 / 纯空白 → 空列表', () => {
    expect(tokenizer.tokenize('')).toEqual([]);
    expect(tokenizer.tokenize('   \t ')).toEqual([]);
  });

  it('按空白分词并折叠多余空格', () => {
    expect(tokenizer.tokenize('  move   c1   30  0 ')).toEqual([
      { value: 'move', quoted: false },
      { value: 'c1', quoted: false },
      { value: '30', quoted: false },
      { value: '0', quoted: false },
    ]);
  });

  it('双引号内保留空格，且带 quoted 标记', () => {
    expect(tokenizer.tokenize('create text t1 20 40 "My Diagram"')).toEqual([
      { value: 'create', quoted: false },
      { value: 'text', quoted: false },
      { value: 't1', quoted: false },
      { value: '20', quoted: false },
      { value: '40', quoted: false },
      { value: 'My Diagram', quoted: true },
    ]);
  });

  it('引号紧邻后续字符时正确切分', () => {
    expect(tokenizer.tokenize('"a b"c')).toEqual([
      { value: 'a b', quoted: true },
      { value: 'c', quoted: false },
    ]);
  });

  it('未闭合引号：到行尾为内容，不报错', () => {
    expect(tokenizer.tokenize('set t text "unfinished words')).toEqual([
      { value: 'set', quoted: false },
      { value: 't', quoted: false },
      { value: 'text', quoted: false },
      { value: 'unfinished words', quoted: true },
    ]);
  });

  it('空引号产生空值 token（可作 text 内容）', () => {
    expect(tokenizer.tokenize('set t text ""')).toEqual([
      { value: 'set', quoted: false },
      { value: 't', quoted: false },
      { value: 'text', quoted: false },
      { value: '', quoted: true },
    ]);
  });

  it('quoted 标记区分 "in" 与 in 子句', () => {
    const quoted = tokenizer.tokenize('create text t1 20 40 "in"');
    expect(quoted[quoted.length - 1]?.quoted).toBe(true);
    const clause = tokenizer.tokenize('create rect r1 0 0 10 10 in node1');
    expect(clause[clause.length - 2]).toEqual({ value: 'in', quoted: false });
  });
});
