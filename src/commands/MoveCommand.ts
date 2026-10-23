import type { Document } from '../model/Document';
import { NumberFormat } from '../model/NumberFormat';
import type { Shape } from '../model/Shape';
import type { Command, CommandResult } from './Command';

/**
 * move：增量平移（容器递归到子孙）。
 * 回显：叶子用位置锚点（moved to (x,y)），容器用增量（moved by (dx,dy)）。
 */
export class MoveCommand implements Command {
  public constructor(
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  public execute(doc: Document): CommandResult {
    const shape = doc.find(this.id);
    shape.move(this.dx, this.dy);
    return { lines: [this.echo(shape, 'moved', this.dx, this.dy)] };
  }

  public undo(doc: Document): CommandResult {
    const shape = doc.find(this.id);
    shape.move(-this.dx, -this.dy);
    return { lines: [this.echo(shape, 'moved back', -this.dx, -this.dy)] };
  }

  private echo(shape: Shape, verb: string, dx: number, dy: number): string {
    const label = `${shape.kind}#${shape.id}`;
    if (shape.isContainer) {
      return `${label} ${verb} by (${NumberFormat.format(dx)},${NumberFormat.format(dy)})`;
    }
    return `${label} ${verb} to ${shape.positionAnchor() ?? ''}`;
  }
}
