import * as fs from 'node:fs';
import { DomainError } from '../model/DomainError';
import type { FileStore } from './FileStore';

/** Node fs 实现；错误统一转 DomainError，message 即需求 4.2 的文案。 */
export class NodeFileStore implements FileStore {
  public readText(path: string): string {
    try {
      return fs.readFileSync(path, 'utf-8');
    } catch {
      throw new DomainError(`cannot read file: ${path}`);
    }
  }

  public writeText(path: string, text: string): void {
    try {
      fs.writeFileSync(path, text, 'utf-8');
    } catch {
      throw new DomainError(`cannot write file: ${path}`);
    }
  }
}
