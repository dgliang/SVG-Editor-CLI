import { DomainError } from '../model/DomainError';
import type { Document } from '../model/Document';
import { Group } from '../model/Group';
import type { Shape } from '../model/Shape';
import type { Command, CommandResult } from './Command';

interface MemberRecord {
  shape: Shape;
  parent: Group;
  index: number;
}

/**
 * group：新建容器并收入若干已存在图形（从各自原父摘出，保持列表顺序）。
 * 锚点规则（设计 4.2）：新容器插入第一个成员的原父容器，
 * 位置为所有成员摘除后第一个成员应处的索引。
 */
export class GroupCommand implements Command {
  private members: MemberRecord[] = [];
  private group: Group | null = null;

  public constructor(
    private readonly newId: string,
    private readonly memberIds: string[],
  ) {}

  public execute(doc: Document): CommandResult {
    if (doc.has(this.newId)) {
      throw new DomainError(`id already exists: ${this.newId}`);
    }
    if (this.memberIds.length === 0) {
      throw new DomainError('group requires at least one member');
    }
    const shapes = this.memberIds.map((id) => doc.find(id));
    const seen = new Set<string>();
    for (const id of this.memberIds) {
      if (seen.has(id)) throw new DomainError(`duplicate member: ${id}`);
      seen.add(id);
    }
    // 某成员是另一成员的祖先 → 会成环
    const memberSet = new Set<Shape>(shapes);
    for (const s of shapes) {
      let cur = s.parent;
      while (cur) {
        if (memberSet.has(cur)) {
          throw new DomainError(`cannot group a container into its own descendant: ${cur.id}`);
        }
        cur = cur.parent;
      }
    }
    // 全部校验通过后才开始改树：先记录每个成员的原父/原索引
    this.members = shapes.map((s) => {
      const parent = s.parent as Group; // find() 命中的节点必在文档内
      return { shape: s, parent, index: parent.indexOf(s) };
    });
    const first = this.members[0];
    if (!first) throw new Error('GroupCommand: empty members');
    // 同父且排在第一个成员之前的成员也会被摘除，锚点索引随之左移
    const removedBefore = this.members.filter(
      (m) => m.parent === first.parent && m.index < first.index,
    ).length;
    const anchorParent = first.parent;
    const anchorIndex = first.index - removedBefore;

    for (const m of this.members) doc.detach(m.shape);
    const group = new Group(this.newId);
    doc.attach(group, anchorParent, anchorIndex);
    for (const m of this.members) doc.attach(m.shape, group);
    this.group = group;
    return { lines: [`g#${this.newId} created with ${this.members.length} children`] };
  }

  public undo(doc: Document): CommandResult {
    if (!this.group) throw new Error('GroupCommand.undo before execute');
    // 先把成员从组里摘出（此时组仍在文档内），再摘组，最后按原索引升序插回
    for (const m of this.members) doc.detach(m.shape);
    doc.detach(this.group);
    const sorted = [...this.members].sort((a, b) => a.index - b.index);
    for (const m of sorted) doc.attach(m.shape, m.parent, m.index);
    return { lines: [`g#${this.newId} grouping undone`] };
  }
}
