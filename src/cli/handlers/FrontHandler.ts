import type { Editor } from '../../app/Editor';
import { ZOrderCommand } from '../../commands/ZOrderCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'front <id>';

/** front <id>：同级最前（最后绘制）。 */
export class FrontHandler extends BaseHandler {
  public readonly names = ['front'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 1, 1, USAGE);
    return editor.execute(new ZOrderCommand(this.text(args, 0, USAGE), 'front'));
  }
}
