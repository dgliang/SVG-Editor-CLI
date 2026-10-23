/**
 * 文件存储抽象：io 的读写边界，便于测试替换（内存实现）与未来扩展。
 */
export interface FileStore {
  /** 读入整个文本文件；失败抛 DomainError('cannot read file: <path>')。 */
  readText(path: string): string;
  /** 整体写出文本文件；失败抛 DomainError('cannot write file: <path>')。 */
  writeText(path: string, text: string): void;
}
