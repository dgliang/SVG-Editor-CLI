import type { Editor } from '../../app/Editor';
import { SetCommand } from '../../commands/SetCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'set <id> <attr> <value>';

/** set <id> <attr> <value>：value 可为带引号的文本；白名单由图形自身校验。 */
export class SetHandler extends BaseHandler {
  public readonly names = ['set'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 3, 3, USAGE);
    const id = this.text(args, 0, USAGE);
    const attr = this.text(args, 1, USAGE);
    return editor.execute(new SetCommand(id, attr, this.text(args, 2, USAGE)));
  }
}
