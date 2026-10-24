import type { Editor } from '../../app/Editor';
import { ZOrderCommand } from '../../commands/ZOrderCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'back <id>';

/** back <id>：同级最后（最先绘制）。 */
export class BackHandler extends BaseHandler {
  public readonly names = ['back'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 1, 1, USAGE);
    return editor.execute(new ZOrderCommand(this.text(args, 0, USAGE), 'back'));
  }
}
