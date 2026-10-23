import { DomainError } from '../model/DomainError';
import type { Document } from '../model/Document';
import type { Group } from '../model/Group';
import type { Shape } from '../model/Shape';
import type { Command, CommandResult } from './Command';

/** ungroup：子图形提升到原容器的父级、占据原容器的位置；undo 逆序还原。 */
export class UngroupCommand implements Command {
  private record: { group: Group; parent: Group; index: number; children: Shape[] } | null = null;

  public constructor(private readonly id: string) {}

  public execute(doc: Document): CommandResult {
    const shape = doc.find(this.id);
    if (!shape.isContainer) {
      throw new DomainError(`cannot ungroup composite shape: ${this.id}`);
    }
    const group = shape as Group;
    const parent = group.parent;
    if (parent === null || parent === doc.getRoot()) {
      throw new DomainError(`cannot ungroup top-level container: ${this.id}`);
    }
    const index = parent.indexOf(group);
    const children = [...group.readonlyChildren()];
    for (const c of children) doc.detach(c);
    doc.detach(group);
    children.forEach((c, i) => doc.attach(c, parent, index + i));
    this.record = { group, parent, index, children };
    return { lines: [`g#${this.id} ungrouped (${children.length} children)`] };
  }

  public undo(doc: Document): CommandResult {
    const r = this.requireRecord();
    for (const c of r.children) doc.detach(c);
    doc.attach(r.group, r.parent, r.index);
    for (const c of r.children) doc.attach(c, r.group);
    return { lines: [`g#${this.id} regrouped (${r.children.length} children)`] };
  }

  private requireRecord(): { group: Group; parent: Group; index: number; children: Shape[] } {
    if (!this.record) throw new Error('UngroupCommand.undo before execute');
    return this.record;
  }
}
