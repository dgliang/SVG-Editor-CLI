import { Shape } from './Shape';
import { DomainError } from './DomainError';
import type { SvgNodeData } from './SvgNodeData';
import type { Transform2D } from './Transform2D';

/** Group 的快照：父级快照 + 子级快照数组（按当前顺序）。 */
interface GroupSnapshot {
  attrs: Record<string, string>;
  children: unknown[];
}

/**
 * Composite 容器。
 * - 不保存 transform：读入时已扁平化；group 自身没有几何坐标
 * - 唯一改树入口是 Document.attach/detach/reparent，本类的 append/remove 仅供
 *   Document 在已维护好 parent 指针的前提下调用
 */
export class Group extends Shape {
  public readonly kind = 'g';
  private readonly attrs = new Map<string, string>();
  private readonly children: Shape[] = [];

  public constructor(id: string) {
    super(id);
  }

  public override get isContainer(): boolean {
    return true;
  }

  // ===== 子节点操作（仅供 Document 调用，外部不得直接改 children） =====

  /** 子节点数（不含嵌套子孙）。 */
  public childCount(): number {
    return this.children.length;
  }

  /** 所有直接子节点的快照副本（只读视图）。 */
  public readonlyChildren(): readonly Shape[] {
    return this.children;
  }

  /** 在末尾追加。 */
  public appendChild(child: Shape): void {
    this.children.push(child);
  }

  /** 在 index 处插入；index 越界抛 Error。 */
  public insertChildAt(child: Shape, index: number): void {
    if (index < 0 || index > this.children.length) {
      throw new Error(`Group.insertChildAt: index out of range: ${index}`);
    }
    this.children.splice(index, 0, child);
  }

  /** 在 index 处移除并返回。index 越界抛 Error。 */
  public removeChildAt(index: number): Shape {
    if (index < 0 || index >= this.children.length) {
      throw new Error(`Group.removeChildAt: index out of range: ${index}`);
    }
    const [removed] = this.children.splice(index, 1);
    // splice 在严格模式下不会返回 undefined（由上面的越界检查保证）
    return removed as Shape;
  }

  /** 查找子节点位置；不存在返回 -1。 */
  public indexOf(child: Shape): number {
    return this.children.indexOf(child);
  }

  // ===== Shape 抽象实现 =====

  public move(dx: number, dy: number): void {
    for (const child of this.children) {
      child.move(dx, dy);
    }
  }

  public scale(factor: number): void {
    for (const child of this.children) {
      child.scale(factor);
    }
  }

  public applyTransform(t: Transform2D): void {
    for (const child of this.children) {
      child.applyTransform(t);
    }
  }

  public getAttr(attr: string): string | undefined {
    return this.attrs.get(attr);
  }

  public setAttr(attr: string, value: string): void {
    // 组只接受公共样式属性，几何属性对组无意义
    const publicStyle = new Set(['fill', 'stroke', 'stroke-width']);
    if (!publicStyle.has(attr)) {
      throw new DomainError(`unknown attribute: ${attr}`);
    }
    this.attrs.set(attr, value);
  }

  public snapshot(): GroupSnapshot {
    const attrs: Record<string, string> = {};
    for (const [k, v] of this.attrs) attrs[k] = v;
    const children = this.children.map((c) => c.snapshot());
    return { attrs, children };
  }

  public restore(state: unknown): void {
    const s = state as GroupSnapshot;
    this.attrs.clear();
    for (const [k, v] of Object.entries(s.attrs)) this.attrs.set(k, v);
    if (s.children.length !== this.children.length) {
      throw new Error('Group.restore: snapshot child count mismatch');
    }
    for (let i = 0; i < s.children.length; i++) {
      // strict 模式 + noUncheckedIndexedAccess：必须显式检查
      const child = this.children[i];
      if (child) child.restore(s.children[i]);
    }
  }

  public treeFields(): string {
    return '';
  }

  public detailFields(): string[] {
    return [`children=${this.children.length}`];
  }

  public toSvgNode(): SvgNodeData {
    const attrs: Record<string, string> = { id: this.id };
    for (const [k, v] of this.attrs) attrs[k] = v;
    return {
      tag: 'g',
      attrs,
      children: this.children.map((c) => c.toSvgNode()),
    };
  }
}
