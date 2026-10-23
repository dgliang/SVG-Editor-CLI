import { DomainError } from '../model/DomainError';
import type { Document } from '../model/Document';
import type { Group } from '../model/Group';
import type { Shape } from '../model/Shape';
import type { Command, CommandResult } from './Command';

/** addto：把已有图形移入容器末尾；环/自身校验由 Document.reparent 与本类分担。 */
export class AddToCommand implements Command {
  private record: { shape: Shape; parent: Group; index: number } | null = null;

  public constructor(
    private readonly containerId: string,
    private readonly shapeId: string,
  ) {}

  public execute(doc: Document): CommandResult {
    const container = doc.find(this.containerId);
    if (!container.isContainer) {
      throw new DomainError(`not a container: ${this.containerId}`);
    }
    const shape = doc.find(this.shapeId);
    if (shape === container) {
      throw new DomainError(`cannot addto a shape into itself: ${this.shapeId}`);
    }
    const parent = shape.parent as Group; // find() 命中的节点必在文档内
    const index = parent.indexOf(shape);
    // 目标容器是 shape 的子孙时，reparent 抛 cannot addto a container into its own descendant
    doc.reparent(shape, container as Group);
    this.record = { shape, parent, index };
    return { lines: [`${shape.kind}#${shape.id} moved into ${container.kind}#${container.id}`] };
  }

  public undo(doc: Document): CommandResult {
    const r = this.requireRecord();
    doc.reparent(r.shape, r.parent, r.index);
    const parentLabel = r.parent === doc.getRoot() ? 'svg' : `${r.parent.kind}#${r.parent.id}`;
    return { lines: [`${r.shape.kind}#${r.shape.id} moved back into ${parentLabel}`] };
  }

  private requireRecord(): { shape: Shape; parent: Group; index: number } {
    if (!this.record) throw new Error('AddToCommand.undo before execute');
    return this.record;
  }
}
