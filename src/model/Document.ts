import type { Shape } from './Shape';
import { Group } from './Group';
import { DomainError } from './DomainError';

/**
 * Document：画布 + 根容器 + id 索引。
 * 所有命令必须经由它改树（attach/detach/reparent），不能直接操作 Group.children。
 * 唯一可寻址的是 root 的子孙，root 自身不接受命令。
 */
export class Document {
  private readonly index = new Map<string, Shape>();
  private readonly root: Group;
  private width: number;
  private height: number;
  /** read 过的文件路径，save 无参数时用它；init 或从未 read/save 时为 null。 */
  private filePath: string | null = null;

  public constructor(width = 800, height = 600) {
    if (width <= 0 || height <= 0) {
      throw new Error('canvas dimensions must be positive');
    }
    this.width = width;
    this.height = height;
    this.root = new Group('svg');
    // root 的 parent 保持 null；root 本身不进 id 索引（不可寻址）
  }

  public getRoot(): Group {
    return this.root;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new DomainError('canvas dimensions must be positive');
    }
    this.width = width;
    this.height = height;
  }

  public getFilePath(): string | null {
    return this.filePath;
  }

  public setFilePath(p: string | null): void {
    this.filePath = p;
  }

  // ===== 查询 =====

  public has(id: string): boolean {
    return this.index.has(id);
  }

  public find(id: string): Shape {
    const shape = this.index.get(id);
    if (!shape) {
      throw new DomainError(`no such shape: ${id}`);
    }
    return shape;
  }

  /** 不含根 svg 的元素总数（用于 read/save 反馈）。 */
  public elementCount(): number {
    return this.index.size;
  }

  // ===== 改树（唯一入口） =====

  /** 检查把 shape 放进 parent 是否会产生环（祖先包含 parent 自身）。 */
  private wouldCreateCycle(shape: Shape, parent: Group): boolean {
    let cur: Shape | null = parent;
    while (cur) {
      if (cur === shape) return true;
      cur = cur.parent;
    }
    return false;
  }

  /**
   * 校验 shape 及其所有子孙的 id 都不与现有索引冲突（排除自身已有的）。
   * 仅在 attach 到新文档 / 重命名后需要检查。
   */
  private validateNoDuplicateIdsInSubtree(shape: Shape): void {
    const seen = new Set<string>();
    this.collectIds(shape, seen);
    for (const id of seen) {
      const existing = this.index.get(id);
      if (existing && existing !== shape) {
        // 如果是 shape 自身或其子孙，existing === 某个子树节点——
        // 但在 attach 前 index 不应有这些 id，所以冲突就是真正的撞 id
        throw new DomainError(`id already exists: ${id}`);
      }
    }
  }

  private collectIds(shape: Shape, out: Set<string>): void {
    if (out.has(shape.id)) {
      throw new DomainError(`id already exists: ${shape.id}`);
    }
    out.add(shape.id);
    if (shape.isContainer) {
      const g = shape as Group;
      for (const child of g.readonlyChildren()) this.collectIds(child, out);
    }
  }

  private registerAll(shape: Shape): void {
    // 先收集所有 id（用 Set 检测自碰撞）
    const ids = new Set<string>();
    this.collectIds(shape, ids);
    // 再与现有索引比对并登记
    for (const id of ids) {
      if (this.index.has(id)) {
        throw new DomainError(`id already exists: ${id}`);
      }
    }
    const walk = (s: Shape): void => {
      this.index.set(s.id, s);
      if (s.isContainer) {
        for (const c of (s as Group).readonlyChildren()) walk(c);
      }
    };
    walk(shape);
  }

  private unregisterAll(shape: Shape): void {
    const walk = (s: Shape): void => {
      this.index.delete(s.id);
      if (s.isContainer) {
        for (const c of (s as Group).readonlyChildren()) walk(c);
      }
    };
    walk(shape);
  }

  /**
   * 把 shape（及整棵子孙树）挂到 parent 下。
   * - parent 必须是本 Document 的 root 或其子孙
   * - shape 不得已在本 Document 中（reparent 用 reparent 而非 detach+attach）
   * - shape 与 parent 之间不得有环
   */
  public attach(shape: Shape, parent: Group, index?: number): void {
    if (shape.parent !== null) {
      throw new Error('attach called on a shape already attached; use reparent');
    }
    if (!this.isOwnedByThis(parent)) {
      throw new Error('attach: parent does not belong to this Document');
    }
    if (this.wouldCreateCycle(shape, parent)) {
      throw new DomainError(`cannot addto a container into its own descendant: ${shape.id}`);
    }
    this.validateNoDuplicateIdsInSubtree(shape);

    this.registerAll(shape);
    shape.parent = parent;
    if (index === undefined) {
      parent.appendChild(shape);
    } else {
      parent.insertChildAt(shape, index);
    }
  }

  /**
   * 从当前 parent 摘下 shape（及其整棵子孙树）。
   * 返回原父与原索引，供 undo 使用。
   */
  public detach(shape: Shape): { parent: Group; index: number } {
    const parent = shape.parent;
    if (!parent) {
      throw new Error('detach called on a shape with no parent');
    }
    if (!this.isOwnedByThis(parent)) {
      throw new Error('detach: shape does not belong to this Document');
    }
    const idx = parent.indexOf(shape);
    if (idx < 0) {
      throw new Error('detach: shape not in its declared parent');
    }
    parent.removeChildAt(idx);
    shape.parent = null;
    this.unregisterAll(shape);
    return { parent, index: idx };
  }

  /** 把已挂载的 shape 从原父移到新父（同文档内）。 */
  public reparent(shape: Shape, newParent: Group, index?: number): void {
    if (shape.parent === null) {
      throw new Error('reparent called on a detached shape; use attach');
    }
    if (!this.isOwnedByThis(newParent)) {
      throw new Error('reparent: newParent does not belong to this Document');
    }
    if (this.wouldCreateCycle(shape, newParent)) {
      throw new DomainError(`cannot addto a container into its own descendant: ${shape.id}`);
    }
    const oldParent = shape.parent;
    const oldIndex = oldParent.indexOf(shape);
    // 从旧父移除（保留 index 供 undo）
    oldParent.removeChildAt(oldIndex);
    shape.parent = null; // 先断开以便 attach 检查

    shape.parent = newParent;
    if (index === undefined) {
      newParent.appendChild(shape);
    } else {
      newParent.insertChildAt(shape, index);
    }
  }

  /** 同父内 z-order 调整（移到最前/最后）。 */
  public zOrder(shape: Shape, op: 'front' | 'back'): void {
    const parent = shape.parent;
    if (!parent) throw new Error('zOrder on detached shape');
    const idx = parent.indexOf(shape);
    if (idx < 0) throw new Error('zOrder: shape not in parent');
    parent.removeChildAt(idx);
    if (op === 'front') parent.appendChild(shape);
    else parent.insertChildAt(shape, 0);
  }

  /** 判断 target 及其祖先链是否属于本 Document（root 也属于）。 */
  private isOwnedByThis(target: Shape): boolean {
    let cur: Shape | null = target;
    while (cur) {
      if (cur === this.root) return true;
      cur = cur.parent;
    }
    return false;
  }
}
