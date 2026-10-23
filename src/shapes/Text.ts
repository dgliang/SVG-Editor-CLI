import { Shape } from '../model/Shape';
import { DomainError } from '../model/DomainError';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeSnapshot } from '../model/ShapeSnapshot';
import type { SvgNodeData } from '../model/SvgNodeData';
import type { ParamSpec, ShapeProvider } from '../model/ShapeProvider';
import type { Transform2D } from '../model/Transform2D';

const STYLE_ORDER = ['fill', 'stroke', 'stroke-width'] as const;

interface TextSnapshot {
  x: number;
  y: number;
  text: string;
  styles: Record<string, string>;
}

/**
 * 文字。几何：x / y；文本内容通过 `text` 属性读写（set 白名单含 text）。
 * tree 行格式：`(20,40) "My Diagram"`；序列化时内容放 SvgNodeData.text 而非属性。
 */
export class Text extends Shape {
  public readonly kind = 'text';
  private x: number;
  private y: number;
  private text: string;
  private readonly styles = new Map<string, string>();

  public constructor(id: string, x = 0, y = 0, text = '') {
    super(id);
    this.x = x;
    this.y = y;
    this.text = text;
  }

  public move(dx: number, dy: number): void {
    this.applyTransform({ sx: 1, sy: 1, tx: dx, ty: dy });
  }

  public scale(factor: number): void {
    this.applyTransform({ sx: factor, sy: factor, tx: 0, ty: 0 });
  }

  public applyTransform(t: Transform2D): void {
    // 只变换位置；字号不在本期模型内
    this.x = t.sx * this.x + t.tx;
    this.y = t.sy * this.y + t.ty;
  }

  public getAttr(attr: string): string | undefined {
    switch (attr) {
      case 'x': return NumberFormat.format(this.x);
      case 'y': return NumberFormat.format(this.y);
      case 'text': return this.text;
      default: return this.styles.get(attr);
    }
  }

  public setAttr(attr: string, value: string): void {
    switch (attr) {
      case 'x': this.x = NumberFormat.parseStrict(value); return;
      case 'y': this.y = NumberFormat.parseStrict(value); return;
      case 'text': this.text = value; return;
      case 'fill':
      case 'stroke':
      case 'stroke-width':
        this.styles.set(attr, value);
        return;
      default:
        throw new DomainError(`unknown attribute: ${attr}`);
    }
  }

  public snapshot(): ShapeSnapshot {
    const styles: Record<string, string> = {};
    for (const [k, v] of this.styles) styles[k] = v;
    const snap: TextSnapshot = { x: this.x, y: this.y, text: this.text, styles };
    return snap;
  }

  public restore(state: ShapeSnapshot): void {
    const s = state as TextSnapshot;
    this.x = s.x;
    this.y = s.y;
    this.text = s.text;
    this.styles.clear();
    for (const [k, v] of Object.entries(s.styles)) this.styles.set(k, v);
  }

  private geometryFields(): string {
    return `(${NumberFormat.format(this.x)},${NumberFormat.format(this.y)})`;
  }

  public positionAnchor(): string {
    return this.geometryFields();
  }

  public treeFields(): string {
    const base = `${this.geometryFields()} "${this.text}"`;
    const fill = this.styles.get('fill');
    return fill !== undefined ? `${base} fill=${fill}` : base;
  }

  public detailFields(): string[] {
    const lines = [this.geometryFields()];
    for (const key of STYLE_ORDER) {
      const v = this.styles.get(key);
      if (v !== undefined) lines.push(`${key}=${v}`);
    }
    lines.push(`text="${this.text}"`);
    return lines;
  }

  public toSvgNode(): SvgNodeData {
    const attrs: Record<string, string> = {
      id: this.id,
      x: NumberFormat.format(this.x),
      y: NumberFormat.format(this.y),
    };
    for (const key of STYLE_ORDER) {
      const v = this.styles.get(key);
      if (v !== undefined) attrs[key] = v;
    }
    return { tag: 'text', attrs, text: this.text, children: [] };
  }
}

export class TextProvider implements ShapeProvider {
  public readonly kind = 'text';
  public readonly container = false;
  public readonly params: readonly ParamSpec[] = [
    { name: 'x', type: 'number', optional: false },
    { name: 'y', type: 'number', optional: false },
    { name: 'text', type: 'text', optional: false },
  ];

  public create(id: string, args: Record<string, string>): Text {
    const num = (key: string): number => {
      const raw = args[key];
      return raw === undefined ? 0 : NumberFormat.parseLenient(raw);
    };
    return new Text(id, num('x'), num('y'), args['text'] ?? '');
  }
}
