import type { Editor } from '../../app/Editor';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'redo';

/** redo：重做被 undo 的命令。 */
export class RedoHandler extends BaseHandler {
  public readonly names = ['redo'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 0, 0, USAGE);
    return editor.redo();
  }
}
