import type { Editor } from '../../app/Editor';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'save [file.svg]';

/** save [file.svg]：保存当前文档；无参数时写回 read 的路径。 */
export class SaveHandler extends BaseHandler {
  public readonly names = ['save'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 0, 1, USAGE);
    if (args.length === 0) return editor.save();
    return editor.save(this.text(args, 0, USAGE));
  }
}
