import type { Editor } from '../../app/Editor';
import { TreeRenderer } from '../../view/TreeRenderer';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'tree [id]';

/** tree [id]：全文档结构树，或指定节点为根的子树。 */
export class TreeHandler extends BaseHandler {
  public readonly names = ['tree'];
  private readonly renderer = new TreeRenderer();

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 0, 1, USAGE);
    const doc = editor.requireDocument();
    if (args.length === 0) return this.renderer.render(doc);
    return this.renderer.renderSubtree(doc.find(this.text(args, 0, USAGE)));
  }
}
