import type { Editor } from '../../app/Editor';
import { UngroupCommand } from '../../commands/UngroupCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'ungroup <gid>';

/** ungroup <gid>：解散容器，子图形提升到原容器的父级。 */
export class UngroupHandler extends BaseHandler {
  public readonly names = ['ungroup'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 1, 1, USAGE);
    return editor.execute(new UngroupCommand(this.text(args, 0, USAGE)));
  }
}
