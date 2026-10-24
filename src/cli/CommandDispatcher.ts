import type { Editor } from '../app/Editor';
import { DomainError } from '../model/DomainError';
import type { CommandHandler } from './CommandHandler';
import type { Token } from './Tokenizer';

/**
 * 按命令名分派到 handler。这是需求允许的两处「按名字分派」之一，
 * 集中在这一个 Map 中，便于后续替换为插件注册（架构方案中标注待重构）。
 */
export class CommandDispatcher {
  private readonly byName = new Map<string, CommandHandler>();

  public constructor(handlers: readonly CommandHandler[]) {
    for (const handler of handlers) {
      for (const name of handler.names) {
        this.byName.set(name, handler);
      }
    }
  }

  public dispatch(tokens: readonly Token[], editor: Editor): string[] {
    const head = tokens[0];
    if (!head) return [];
    const handler = this.byName.get(head.value);
    if (!handler) {
      throw new DomainError(`unknown command: ${head.value}`);
    }
    return handler.run(tokens.slice(1), editor);
  }
}
