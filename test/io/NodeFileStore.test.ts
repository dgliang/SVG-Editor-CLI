import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { NodeFileStore } from '../../src/io/NodeFileStore';
import { DomainError } from '../../src/model/DomainError';

describe('NodeFileStore', () => {
  it('写入后可读回同样内容（utf-8 往返）', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'svg-io-'));
    try {
      const file = path.join(dir, 'a.svg');
      const store = new NodeFileStore();
      store.writeText(file, 'hello\n世界\n');
      expect(store.readText(file)).toBe('hello\n世界\n');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('读不存在的文件抛 cannot read file: <path>', () => {
    const p = path.join(os.tmpdir(), 'svg-io-no-such-file.svg');
    expect(() => new NodeFileStore().readText(p)).toThrow(DomainError);
    expect(() => new NodeFileStore().readText(p)).toThrow(`cannot read file: ${p}`);
  });

  it('写到不存在目录抛 cannot write file: <path>', () => {
    const p = path.join(os.tmpdir(), 'svg-io-no-such-dir', 'a.svg');
    expect(() => new NodeFileStore().writeText(p, 'x')).toThrow(DomainError);
    expect(() => new NodeFileStore().writeText(p, 'x')).toThrow(`cannot write file: ${p}`);
  });
});
