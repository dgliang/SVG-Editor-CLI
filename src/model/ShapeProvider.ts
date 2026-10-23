import type { Shape } from './Shape';

export interface ParamSpec {
  /** 参数名，如 'x' / 'width' / 'fill' / 'text'。 */
  name: string;
  /** 类型：'number' 会做严格数字校验，'text' 原样保留（用于 text 内容）。 */
  type: 'number' | 'text';
  /** 是否允许缺失。 */
  optional: boolean;
}

/**
 * 图形类型插件插槽。内核通过注册表按 kind 查找 provider，
 * 不 import 任何具体图形类——这是后续 box 插件化阶段 "内核新增 0 行代码" 的基础。
 */
export interface ShapeProvider {
  /** 类型名，如 'rect' / 'text'。大小写敏感。 */
  readonly kind: string;
  /** 是否容器类（Group / 复合图形）。 */
  readonly container: boolean;
  /**
   * 参数 schema。顺序即命令行参数顺序（create 命令）。
   * 所有参数（含可选的 fill/stroke）都要列出。
   */
  readonly params: readonly ParamSpec[];

  /**
   * 构造图形。args 键为参数名（text 元素的文本内容用键 'text'）。
   * 插件对缺失参数取合理默认值，非法值自行处理（或抛 DomainError）。
   */
  create(id: string, args: Record<string, string>): Shape;
}
