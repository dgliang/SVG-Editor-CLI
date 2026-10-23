import type { Document } from '../model/Document';
import type { ShapeSnapshot } from '../model/ShapeSnapshot';
import type { Command, CommandResult } from './Command';

/**
 * set：设置白名单属性。undo 用快照还原（旧值未设置过时也能正确抹掉），
 * 非法属性由 Shape.setAttr 抛错，失败不改任何状态。
 */
export class SetCommand implements Command {
  private backup: ShapeSnapshot | null = null;
  private oldValue: string | undefined;

  public constructor(
    private readonly id: string,
    private readonly attr: string,
    private readonly value: string,
  ) {}

  public execute(doc: Document): CommandResult {
    const shape = doc.find(this.id);
    this.backup = shape.snapshot();
    this.oldValue = shape.getAttr(this.attr);
    shape.setAttr(this.attr, this.value);
    return { lines: [`${shape.kind}#${shape.id} updated: ${this.attr}="${this.value}"`] };
  }

  public undo(doc: Document): CommandResult {
    if (!this.backup) throw new Error('SetCommand.undo before execute');
    const shape = doc.find(this.id);
    shape.restore(this.backup);
    return { lines: [`${shape.kind}#${shape.id} updated: ${this.attr}="${this.oldValue ?? ''}"`] };
  }
}
