import { DomainError } from '../model/DomainError';
import type { Document } from '../model/Document';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeSnapshot } from '../model/ShapeSnapshot';
import type { Command, CommandResult } from './Command';

/**
 * scale：等比缩放（容器递归）。undo 用整棵子树快照原位还原，
 * 避免 1/factor 的浮点漂移（设计 4.2）。
 */
export class ScaleCommand implements Command {
  private backup: ShapeSnapshot | null = null;

  public constructor(
    private readonly id: string,
    private readonly factor: number,
  ) {}

  public execute(doc: Document): CommandResult {
    if (!(this.factor > 0)) {
      throw new DomainError('scale factor must be positive');
    }
    const shape = doc.find(this.id);
    this.backup = shape.snapshot();
    shape.scale(this.factor);
    return { lines: [`${shape.kind}#${shape.id} scaled by ${NumberFormat.format(this.factor)}`] };
  }

  public undo(doc: Document): CommandResult {
    if (!this.backup) throw new Error('ScaleCommand.undo before execute');
    const shape = doc.find(this.id);
    shape.restore(this.backup);
    return { lines: [`${shape.kind}#${shape.id} scaled back by ${NumberFormat.format(1 / this.factor)}`] };
  }
}
