import type { Document } from '../model/Document';
import type { Group } from '../model/Group';
import { NumberFormat } from '../model/NumberFormat';
import type { Shape } from '../model/Shape';

/** 单行待排版的树节点：前缀连接符 + 标签 + treeFields。 */
interface Row {
  prefix: string;
  label: string;
  fields: string;
}

/**
 * 结构树渲染：全文档 / 指定子树。
 * 字段内容全部来自 Shape.treeFields()，本类只负责缩进、连接符与对齐。
 * 对齐规则：同一份输出内，所有「前缀+标签」按最宽者左对齐，字段前固定 2 空格；
 * 无字段的容器不补尾随空格。
 */
export class TreeRenderer {
  /** 全文档：首行 `svg (WxH)`。 */
  public render(doc: Document): string[] {
    const rows: Row[] = [];
    this.collect(doc.getRoot().readonlyChildren(), '', rows);
    const header = `svg (${NumberFormat.format(doc.getWidth())}x${NumberFormat.format(doc.getHeight())})`;
    return [header, ...this.format(rows)];
  }

  /** 以指定节点为根重画：根行是 `kind#id` + 字段，不带 svg 前缀。 */
  public renderSubtree(shape: Shape): string[] {
    const rows: Row[] = [{ prefix: '', label: this.label(shape), fields: shape.treeFields() }];
    if (shape.isContainer) {
      this.collect((shape as Group).readonlyChildren(), '', rows);
    }
    return this.format(rows);
  }

  private collect(children: readonly Shape[], prelude: string, rows: Row[]): void {
    children.forEach((child, i) => {
      const last = i === children.length - 1;
      rows.push({
        prefix: prelude + (last ? '└── ' : '├── '),
        label: this.label(child),
        fields: child.treeFields(),
      });
      if (child.isContainer) {
        this.collect((child as Group).readonlyChildren(), prelude + (last ? '    ' : '│   '), rows);
      }
    });
  }

  private label(shape: Shape): string {
    return `${shape.kind}#${shape.id}`;
  }

  private format(rows: Row[]): string[] {
    let width = 0;
    for (const row of rows) {
      width = Math.max(width, row.prefix.length + row.label.length);
    }
    return rows.map((row) => {
      const head = row.prefix + row.label;
      return row.fields.length > 0 ? `${head.padEnd(width)}  ${row.fields}` : head;
    });
  }
}
