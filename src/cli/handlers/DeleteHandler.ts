import type { Editor } from '../../app/Editor';
import { DeleteCommand } from '../../commands/DeleteCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'delete <id>';

/** delete <id>：删除图形（容器连子孙）。 */
export class DeleteHandler extends BaseHandler {
  public readonly names = ['delete'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 1, 1, USAGE);
    return editor.execute(new DeleteCommand(this.text(args, 0, USAGE)));
  }
}
