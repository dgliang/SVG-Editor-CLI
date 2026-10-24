import type { Editor } from '../../app/Editor';
import { MoveCommand } from '../../commands/MoveCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'move <id> <dx> <dy>';

/** move <id> <dx> <dy>：增量平移；容器整体平移。 */
export class MoveHandler extends BaseHandler {
  public readonly names = ['move'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 3, 3, USAGE);
    const id = this.text(args, 0, USAGE);
    const dx = this.number(args, 1, USAGE);
    const dy = this.number(args, 2, USAGE);
    return editor.execute(new MoveCommand(id, dx, dy));
  }
}
