import type { Editor } from '../../app/Editor';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'init [w] [h]';

/** init [w] [h]：新建空画布（默认 800x600）。 */
export class InitHandler extends BaseHandler {
  public readonly names = ['init'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 0, 2, USAGE);
    if (args.length === 0) return editor.init();
    return editor.init(this.positive(args, 0, USAGE), this.positive(args, 1, USAGE));
  }
}
