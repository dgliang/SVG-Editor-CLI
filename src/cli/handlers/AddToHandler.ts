import type { Editor } from '../../app/Editor';
import { AddToCommand } from '../../commands/AddToCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'addto <gid> <id>';

/** addto <gid> <id>：把已有图形移入容器末尾。 */
export class AddToHandler extends BaseHandler {
  public readonly names = ['addto'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 2, 2, USAGE);
    const containerId = this.text(args, 0, USAGE);
    return editor.execute(new AddToCommand(containerId, this.text(args, 1, USAGE)));
  }
}
