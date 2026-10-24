import type { Editor } from '../../app/Editor';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'canvas [w] [h]';

/** canvas [w] [h]：无参数显示尺寸，带参数修改尺寸。 */
export class CanvasHandler extends BaseHandler {
  public readonly names = ['canvas'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 0, 2, USAGE);
    if (args.length === 0) return editor.canvas();
    return editor.canvas(this.positive(args, 0, USAGE), this.positive(args, 1, USAGE));
  }
}
