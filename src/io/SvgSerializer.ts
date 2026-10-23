import type { Document } from '../model/Document';
import { NumberFormat } from '../model/NumberFormat';
import type { SvgNodeData } from '../model/SvgNodeData';

/**
 * Document → SVG 文本。只依赖 model 的 SvgNodeData，
 * 缩进 / 转义 / 属性拼接集中在这里，图形类不碰字符串格式。
 *
 * 输出格式（与需求 0.1 / 4.1 示例一致）：
 * - 固定 XML 头 + 带 xmlns 的 svg 根，width/height/viewBox 来自 Document
 * - 每行一个元素，2 空格缩进
 * - 无子节点且无文本的元素自闭合（`<rect .../>`，`/` 前无空格）
 * - text 元素单行双标签（`<text ...>内容</text>`）
 * - 属性转义 & < > "，文本内容转义 & < >
 */
export class SvgSerializer {
  public serialize(doc: Document): string {
    const w = NumberFormat.format(doc.getWidth());
    const h = NumberFormat.format(doc.getHeight());
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    ];
    // 根 g 自身不序列化（id 为 'svg' 仅用于显示），只输出其子孙
    for (const child of doc.getRoot().toSvgNode().children) {
      this.renderNode(child, 1, lines);
    }
    lines.push('</svg>');
    return lines.join('\n') + '\n';
  }

  private renderNode(node: SvgNodeData, depth: number, out: string[]): void {
    const indent = '  '.repeat(depth);
    const attrs = Object.entries(node.attrs)
      .map(([k, v]) => `${k}="${this.escapeAttr(v)}"`)
      .join(' ');
    const open = attrs ? `${indent}<${node.tag} ${attrs}` : `${indent}<${node.tag}`;
    if (node.text !== undefined) {
      out.push(`${open}>${this.escapeText(node.text)}</${node.tag}>`);
      return;
    }
    if (node.children.length === 0) {
      out.push(`${open}/>`);
      return;
    }
    out.push(`${open}>`);
    for (const child of node.children) {
      this.renderNode(child, depth + 1, out);
    }
    out.push(`${indent}</${node.tag}>`);
  }

  private escapeAttr(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeText(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
