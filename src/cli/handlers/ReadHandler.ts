import type { Editor } from '../../app/Editor';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'read <file.svg>';

/** read <file.svg>：读入 SVG 作为当前文档。 */
export class ReadHandler extends BaseHandler {
  public readonly names = ['read'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 1, 1, USAGE);
    return editor.read(this.text(args, 0, USAGE));
  }
}
