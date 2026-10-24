import type { Editor } from '../../app/Editor';
import { ShapeDetailRenderer } from '../../view/ShapeDetailRenderer';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'show <id>';

/** show <id>：单个图形的属性明细。 */
export class ShowHandler extends BaseHandler {
  public readonly names = ['show'];
  private readonly renderer = new ShapeDetailRenderer();

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 1, 1, USAGE);
    const doc = editor.requireDocument();
    return this.renderer.render(doc.find(this.text(args, 0, USAGE)));
  }
}
