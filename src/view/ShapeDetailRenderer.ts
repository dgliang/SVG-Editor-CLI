import type { Shape } from '../model/Shape';

/**
 * 单图形属性明细（show）。字段内容来自 Shape.detailFields()。
 * 首行 `kind#id  parent=<父级标签>`；明细每行缩进 2 空格；缺省属性不输出。
 */
export class ShapeDetailRenderer {
  public render(shape: Shape): string[] {
    const parent = shape.parent;
    // 根容器的 parent 为 null；根自身不进索引，顶层图形的父级显示为 svg
    const parentLabel = parent === null || parent.parent === null
      ? 'svg'
      : `${parent.kind}#${parent.id}`;
    const lines = [`${shape.kind}#${shape.id}  parent=${parentLabel}`];
    for (const field of shape.detailFields()) {
      lines.push(`  ${field}`);
    }
    return lines;
  }
}
