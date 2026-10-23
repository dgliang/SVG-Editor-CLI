import type { Document } from '../model/Document';
import type { Group } from '../model/Group';
import type { Shape } from '../model/Shape';
import type { Command, CommandResult } from './Command';

/** delete：摘除整棵子树；undo 按原父/原索引挂回。 */
export class DeleteCommand implements Command {
  private record: { shape: Shape; parent: Group; index: number } | null = null;

  public constructor(private readonly id: string) {}

  public execute(doc: Document): CommandResult {
    const shape = doc.find(this.id);
    const { parent, index } = doc.detach(shape);
    this.record = { shape, parent, index };
    return { lines: [`${shape.kind}#${shape.id} deleted`] };
  }

  public undo(doc: Document): CommandResult {
    const r = this.requireRecord();
    doc.attach(r.shape, r.parent, r.index);
    const parentLabel = r.parent === doc.getRoot() ? 'svg' : `${r.parent.kind}#${r.parent.id}`;
    return { lines: [`${r.shape.kind}#${r.shape.id} restored into ${parentLabel}`] };
  }

  private requireRecord(): { shape: Shape; parent: Group; index: number } {
    if (!this.record) throw new Error('DeleteCommand.undo before execute');
    return this.record;
  }
}
