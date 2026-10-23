import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Document } from '../model/Document';
import { DomainError } from '../model/DomainError';
import type { Group } from '../model/Group';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeRegistry } from '../model/ShapeRegistry';
import type { Transform2D } from '../model/Transform2D';
import { IDENTITY_TRANSFORM, combineTransforms } from '../model/Transform2D';

/** fast-xml-parser preserveOrder 模式的节点：{tag: children, ':@': attrs} 或 {'#text': str}。 */
type XmlNode = Record<string, unknown>;

export interface ParseResult {
  doc: Document;
  /** 完整输出行（含 'warning: ' 前缀），由调用方直接打印。 */
  warnings: string[];
}

/**
 * SVG 文本 → Document。容错读取（设计决策 7）：
 * - 缺 id 按 `标签名+序号` 自动补并警告
 * - 重复 id 重命名为 `id_2` 递增并警告
 * - 不支持的标签跳过整棵子树并警告；title/desc/注释/文本静默跳过
 * - transform 只认 translate/scale，扁平化到几何值（设计决策 4）；
 *   含 rotate/matrix 等则整层按单位阵处理并警告
 * - 属性值宽松解析（'10px' 取 10，缺失取 0）
 *
 * 解析器不认识具体图形类，构造全部经由注入的 ShapeRegistry。
 */
export class SvgParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });

  public parse(text: string, registry: ShapeRegistry): ParseResult {
    const validation = XMLValidator.validate(text);
    if (validation !== true) {
      throw new DomainError(`invalid SVG: ${validation.err.msg}`);
    }
    const parsed = this.parser.parse(text) as XmlNode[];
    const svgNode = parsed.find((n) => typeof n === 'object' && n !== null && 'svg' in n);
    if (!svgNode) {
      throw new DomainError('invalid SVG: root element is not <svg>');
    }
    const svgAttrs = (svgNode[':@'] ?? {}) as Record<string, string>;
    const svgChildren = (svgNode['svg'] ?? []) as XmlNode[];

    const doc = new Document(
      this.resolveDimension(svgAttrs['width'], svgAttrs['viewBox'], 2, 800),
      this.resolveDimension(svgAttrs['height'], svgAttrs['viewBox'], 3, 600),
    );
    const warnings: string[] = [];
    this.parseChildren(svgChildren, doc.getRoot(), IDENTITY_TRANSFORM, doc, registry, warnings);
    return { doc, warnings };
  }

  /** 尺寸：width/height 属性 > viewBox 的第 3/4 个数 > 缺省值。 */
  private resolveDimension(
    attr: string | undefined,
    viewBox: string | undefined,
    viewBoxIndex: number,
    fallback: number,
  ): number {
    if (attr !== undefined) {
      const v = NumberFormat.parseLenient(attr);
      if (v > 0) return v;
    }
    if (viewBox !== undefined) {
      const parts = viewBox.split(/[\s,]+/).filter((s) => s.length > 0);
      const v = Number(parts[viewBoxIndex]);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return fallback;
  }

  private parseChildren(
    nodes: XmlNode[],
    parentGroup: Group,
    accumulated: Transform2D,
    doc: Document,
    registry: ShapeRegistry,
    warnings: string[],
  ): void {
    for (const node of nodes) {
      const tag = this.elementTagOf(node);
      if (tag === null) continue; // #text / #comment：静默
      if (tag === 'title' || tag === 'desc') continue; // 元数据：静默
      if (!registry.has(tag)) {
        warnings.push(`warning: unsupported element <${tag}> skipped`);
        continue;
      }

      const attrs = (node[':@'] ?? {}) as Record<string, string>;
      const children = (node[tag] ?? []) as XmlNode[];

      let local = IDENTITY_TRANSFORM;
      const rawTransform = attrs['transform'];
      if (rawTransform !== undefined) {
        const parsed = this.parseTransform(rawTransform);
        if (parsed === null) {
          warnings.push(`warning: unsupported transform "${rawTransform}" ignored`);
        } else {
          local = parsed;
        }
      }
      // SVG 语义：先应用本层、再应用父层，故父累积为 outer
      const combined = combineTransforms(accumulated, local);

      const id = this.resolveId(tag, attrs['id'], doc, warnings);
      const args: Record<string, string> = { ...attrs };
      delete args['id'];
      delete args['transform'];
      if (tag === 'text') {
        args['text'] = this.collectText(children);
      }

      const shape = registry.get(tag).create(id, args);
      shape.applyTransform(combined);
      doc.attach(shape, parentGroup);
      if (shape.isContainer) {
        this.parseChildren(children, shape as Group, combined, doc, registry, warnings);
      }
    }
  }

  /** 元素节点的标签名；文本/注释节点返回 null。 */
  private elementTagOf(node: XmlNode): string | null {
    for (const key of Object.keys(node)) {
      if (key === ':@') continue;
      if (key === '#text' || key === '#comment') return null;
      return key;
    }
    return null;
  }

  /** 拼接元素内的所有 #text 子节点（text 元素的内容）。 */
  private collectText(children: XmlNode[]): string {
    let out = '';
    for (const c of children) {
      if (typeof c === 'object' && c !== null && '#text' in c) {
        out += String(c['#text']);
      }
    }
    return out;
  }

  /**
   * 解析 transform 属性。只含 translate/scale 时返回组合变换（按列表顺序左乘）；
   * 含其它函数或无法解析时返回 null（调用方警告并按单位阵处理）。
   */
  private parseTransform(raw: string): Transform2D | null {
    const re = /(\w+)\s*\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    let acc = IDENTITY_TRANSFORM;
    let matched = false;
    while ((m = re.exec(raw)) !== null) {
      matched = true;
      const fn = m[1];
      const nums = (m[2] ?? '')
        .split(/[\s,]+/)
        .filter((s) => s.length > 0)
        .map((s) => NumberFormat.parseLenient(s));
      if (fn === 'translate') {
        acc = combineTransforms(acc, { sx: 1, sy: 1, tx: nums[0] ?? 0, ty: nums[1] ?? 0 });
      } else if (fn === 'scale') {
        const sx = nums[0] ?? 1;
        const sy = nums[1] ?? sx;
        acc = combineTransforms(acc, { sx, sy, tx: 0, ty: 0 });
      } else {
        return null;
      }
    }
    return matched ? acc : null;
  }

  private resolveId(
    tag: string,
    rawId: string | undefined,
    doc: Document,
    warnings: string[],
  ): string {
    if (rawId === undefined || rawId === '') {
      let candidate = `${tag}1`;
      let n = 1;
      while (doc.has(candidate)) {
        n++;
        candidate = `${tag}${n}`;
      }
      warnings.push(`warning: assigned id ${candidate} to unnamed <${tag}>`);
      return candidate;
    }
    if (!doc.has(rawId)) return rawId;
    let n = 2;
    let candidate = `${rawId}_${n}`;
    while (doc.has(candidate)) {
      n++;
      candidate = `${rawId}_${n}`;
    }
    warnings.push(`warning: duplicate id ${rawId} renamed to ${candidate}`);
    return candidate;
  }
}
