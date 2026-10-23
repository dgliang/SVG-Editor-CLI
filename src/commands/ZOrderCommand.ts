import type { Document } from '../model/Document';
import type { Command, CommandResult } from './Command';

/** front/back：同父内移到最前（文档末尾，最后绘制）/最后（文档开头）。 */
export class ZOrderCommand implements Command {
  private index = -1;

  public constructor(
    private readonly id: string,
    private readonly op: 'front' | 'back',
  ) {}

  public execute(doc: Document): CommandResult {
    const shape = doc.find(this.id);
    const parent = shape.parent;
    if (parent === null) throw new Error('ZOrderCommand: shape not attached');
    this.index = parent.indexOf(shape);
    doc.zOrder(shape, this.op);
    return { lines: [`${shape.kind}#${shape.id} moved to ${this.op}`] };
  }

  public undo(doc: Document): CommandResult {
    if (this.index < 0) throw new Error('ZOrderCommand.undo before execute');
    const shape = doc.find(this.id);
    const parent = shape.parent;
    if (parent === null) throw new Error('ZOrderCommand: shape not attached');
    doc.reparent(shape, parent, this.index);
    return { lines: [`${shape.kind}#${shape.id} z-order restored`] };
  }
}
