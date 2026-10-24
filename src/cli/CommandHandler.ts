import type { Editor } from '../app/Editor';
import { DomainError } from '../model/DomainError';
import { NumberFormat } from '../model/NumberFormat';
import type { Token } from './Tokenizer';

/**
 * 输入翻译层：把一条命令的 token 翻译成 Command / Editor 调用。
 * 语法校验（参数个数、数字格式）在本层完成；业务校验仍在 model/commands。
 */
export interface CommandHandler {
  /** 负责的命令名（front/back 等一个类一个名字，便于 Dispatcher 建索引）。 */
  readonly names: readonly string[];
  matches(name: string): boolean;
  /** args 不含命令名本身。 */
  run(args: readonly Token[], editor: Editor): string[];
}

/** 各 handler 共用的参数校验小工具。 */
export abstract class BaseHandler implements CommandHandler {
  public abstract readonly names: readonly string[];
  public abstract run(args: readonly Token[], editor: Editor): string[];

  public matches(name: string): boolean {
    return this.names.includes(name);
  }

  /** 参数个数必须在 [min, max] 内，否则抛 usage。 */
  protected requireCount(args: readonly Token[], min: number, max: number, usage: string): void {
    if (args.length < min || args.length > max) {
      throw new DomainError(`usage: ${usage}`);
    }
  }

  protected text(args: readonly Token[], index: number, usage: string): string {
    const token = args[index];
    if (!token) throw new DomainError(`usage: ${usage}`);
    return token.value;
  }

  protected number(args: readonly Token[], index: number, usage: string): number {
    return NumberFormat.parseStrict(this.text(args, index, usage));
  }

  /** 正数校验（画布尺寸）。失败文案与 Document 一致。 */
  protected positive(args: readonly Token[], index: number, usage: string): number {
    const value = this.number(args, index, usage);
    if (!(value > 0)) {
      throw new DomainError('canvas dimensions must be positive');
    }
    return value;
  }
}
