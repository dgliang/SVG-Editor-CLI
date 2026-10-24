import type { Editor } from '../../app/Editor';
import { ScaleCommand } from '../../commands/ScaleCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'scale <id> <factor>';

/** scale <id> <factor>：等比缩放；正数校验由 ScaleCommand 负责。 */
export class ScaleHandler extends BaseHandler {
  public readonly names = ['scale'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 2, 2, USAGE);
    const id = this.text(args, 0, USAGE);
    return editor.execute(new ScaleCommand(id, this.number(args, 1, USAGE)));
  }
}
