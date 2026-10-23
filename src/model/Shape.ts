import type { Group } from './Group';
import type { ShapeSnapshot } from './ShapeSnapshot';
import type { SvgNodeData } from './SvgNodeData';
import type { Transform2D } from './Transform2D';

/**
 * 所有图形元素的抽象基类。叶子图形和 Group 都必须实现这些方法。
 *
 * 设计约束：
 * - 子类不得直接修改 parent / children，必须经由 Document 的改树入口
 * - 子类自行维护几何属性、set 白名单、缩放规则、toSvgNode()
 * - 不做 switch(tag)：每个子类自己知道自己的字段
 */
export abstract class Shape {
  /** 唯一 id，大小写敏感。由构造函数一次性赋值。 */
  public readonly id: string;

  /** 父容器；根节点（Document.root）的 parent 为 null。 */
  public parent: Group | null;

  /** 类型名，如 'rect' / 'circle' / 'g'。 */
  public abstract readonly kind: string;

  /** 是否为容器（Group 返回 true，叶子返回 false）。 */
  public get isContainer(): boolean {
    return false;
  }

  protected constructor(id: string) {
    if (!id || typeof id !== 'string') {
      throw new Error('id must be a non-empty string');
    }
    this.id = id;
    this.parent = null;
  }

  // ===== 多态操作 =====

  /** 增量平移，递归作用于容器的所有子孙。 */
  public abstract move(dx: number, dy: number): void;

  /** 等比缩放，factor 必须正数；递归作用于容器的所有子孙。 */
  public abstract scale(factor: number): void;

  /**
   * 应用无旋转仿射变换（io 扁平化用）。move/scale 是它的特例；
   * 递归作用于容器的所有子孙。
   */
  public abstract applyTransform(t: Transform2D): void;

  /** 读属性值；缺省（未显式设置）返回 undefined。 */
  public abstract getAttr(attr: string): string | undefined;

  /**
   * 设置属性；非法属性抛 DomainError（带 'error: ' 之后的完整文案）。
   * 公共属性 fill/stroke/stroke-width 对所有子类生效；
   * 几何属性白名单由子类自行定义。
   */
  public abstract setAttr(attr: string, value: string): void;

  /** 撤销用快照。Group 递归快照整棵子树。 */
  public abstract snapshot(): ShapeSnapshot;

  /** 从快照还原。 */
  public abstract restore(state: ShapeSnapshot): void;

  /** tree 命令行内字段（不含 kind#id 前缀）。 */
  public abstract treeFields(): string;

  /** show 命令的明细行数组。 */
  public abstract detailFields(): string[];

  /** 产出 SVG 节点数据，由 SvgSerializer 消费。 */
  public abstract toSvgNode(): SvgNodeData;
}
