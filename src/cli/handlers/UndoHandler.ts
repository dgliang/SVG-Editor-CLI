import type { Editor } from '../../app/Editor';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'undo';

/** undo：撤销上一条编辑命令。 */
export class UndoHandler extends BaseHandler {
  public readonly names = ['undo'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 0, 0, USAGE);
    return editor.undo();
  }
}
