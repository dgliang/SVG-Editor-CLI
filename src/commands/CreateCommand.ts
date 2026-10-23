import { DomainError } from '../model/DomainError';
import type { Document } from '../model/Document';
import type { Group } from '../model/Group';
import type { Shape } from '../model/Shape';
import type { ShapeProvider } from '../model/ShapeProvider';
import type { Command, CommandResult } from './Command';

/**
 * create：经 provider 构造图形并挂到根（或 in 子句指定的容器）。
 * 参数数量/数字类型的严格校验由 CLI handler 按 provider.params 完成，
 * 这里只做文档级校验：id 唯一、容器存在且确为容器。
 */
export class CreateCommand implements Command {
  private created: Shape | null = null;

  public constructor(
    private readonly provider: ShapeProvider,
    private readonly id: string,
    private readonly args: Record<string, string>,
    private readonly containerId?: string,
  ) {}

  public execute(doc: Document): CommandResult {
    if (doc.has(this.id)) {
      throw new DomainError(`id already exists: ${this.id}`);
    }
    let parent: Group = doc.getRoot();
    if (this.containerId !== undefined) {
      if (!doc.has(this.containerId)) {
        throw new DomainError(`no such container: ${this.containerId}`);
      }
      const target = doc.find(this.containerId);
      if (!target.isContainer) {
        throw new DomainError(`not a container: ${this.containerId}`);
      }
      parent = target as Group;
    }
    const shape = this.provider.create(this.id, this.args);
    doc.attach(shape, parent);
    this.created = shape;
    const suffix = this.containerId !== undefined ? ` in ${parent.kind}#${parent.id}` : '';
    return { lines: [`${shape.kind}#${shape.id} created${suffix}`] };
  }

  public undo(doc: Document): CommandResult {
    const shape = this.requireCreated();
    doc.detach(shape);
    return { lines: [`${shape.kind}#${shape.id} creation undone`] };
  }

  private requireCreated(): Shape {
    if (!this.created) throw new Error('CreateCommand.undo before execute');
    return this.created;
  }
}
