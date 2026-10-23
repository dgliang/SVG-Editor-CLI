import { Shape } from '../model/Shape';
import { DomainError } from '../model/DomainError';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeSnapshot } from '../model/ShapeSnapshot';
import type { SvgNodeData } from '../model/SvgNodeData';
import type { ParamSpec, ShapeProvider } from '../model/ShapeProvider';
import type { Transform2D } from '../model/Transform2D';

const STYLE_ORDER = ['fill', 'stroke', 'stroke-width'] as const;

interface LineSnapshot {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  styles: Record<string, string>;
}

/** 线段。几何：x1 / y1 / x2 / y2；tree 行格式：`(280,130) -> (520,130)`。 */
export class Line extends Shape {
  public readonly kind = 'line';
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;
  private readonly styles = new Map<string, string>();

  public constructor(id: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0, stroke?: string) {
    super(id);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    if (stroke !== undefined) this.styles.set('stroke', stroke);
  }

  public move(dx: number, dy: number): void {
    this.applyTransform({ sx: 1, sy: 1, tx: dx, ty: dy });
  }

  public scale(factor: number): void {
    this.applyTransform({ sx: factor, sy: factor, tx: 0, ty: 0 });
  }

  public applyTransform(t: Transform2D): void {
    this.x1 = t.sx * this.x1 + t.tx;
    this.y1 = t.sy * this.y1 + t.ty;
    this.x2 = t.sx * this.x2 + t.tx;
    this.y2 = t.sy * this.y2 + t.ty;
  }

  public getAttr(attr: string): string | undefined {
    switch (attr) {
      case 'x1': return NumberFormat.format(this.x1);
      case 'y1': return NumberFormat.format(this.y1);
      case 'x2': return NumberFormat.format(this.x2);
      case 'y2': return NumberFormat.format(this.y2);
      default: return this.styles.get(attr);
    }
  }

  public setAttr(attr: string, value: string): void {
    switch (attr) {
      case 'x1': this.x1 = NumberFormat.parseStrict(value); return;
      case 'y1': this.y1 = NumberFormat.parseStrict(value); return;
      case 'x2': this.x2 = NumberFormat.parseStrict(value); return;
      case 'y2': this.y2 = NumberFormat.parseStrict(value); return;
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
    const snap: LineSnapshot = { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2, styles };
    return snap;
  }

  public restore(state: ShapeSnapshot): void {
    const s = state as LineSnapshot;
    this.x1 = s.x1;
    this.y1 = s.y1;
    this.x2 = s.x2;
    this.y2 = s.y2;
    this.styles.clear();
    for (const [k, v] of Object.entries(s.styles)) this.styles.set(k, v);
  }

  private geometryFields(): string {
    return `(${NumberFormat.format(this.x1)},${NumberFormat.format(this.y1)})`
      + ` -> (${NumberFormat.format(this.x2)},${NumberFormat.format(this.y2)})`;
  }

  public positionAnchor(): string {
    return `(${NumberFormat.format(this.x1)},${NumberFormat.format(this.y1)})`;
  }

  public treeFields(): string {
    const fill = this.styles.get('fill');
    return fill !== undefined ? `${this.geometryFields()} fill=${fill}` : this.geometryFields();
  }

  public detailFields(): string[] {
    const lines = [this.geometryFields()];
    for (const key of STYLE_ORDER) {
      const v = this.styles.get(key);
      if (v !== undefined) lines.push(`${key}=${v}`);
    }
    return lines;
  }

  public toSvgNode(): SvgNodeData {
    const attrs: Record<string, string> = {
      id: this.id,
      x1: NumberFormat.format(this.x1),
      y1: NumberFormat.format(this.y1),
      x2: NumberFormat.format(this.x2),
      y2: NumberFormat.format(this.y2),
    };
    for (const key of STYLE_ORDER) {
      const v = this.styles.get(key);
      if (v !== undefined) attrs[key] = v;
    }
    return { tag: 'line', attrs, children: [] };
  }
}

export class LineProvider implements ShapeProvider {
  public readonly kind = 'line';
  public readonly container = false;
  public readonly params: readonly ParamSpec[] = [
    { name: 'x1', type: 'number', optional: false },
    { name: 'y1', type: 'number', optional: false },
    { name: 'x2', type: 'number', optional: false },
    { name: 'y2', type: 'number', optional: false },
    // 需求 4.1：line 的可选参数是 stroke（不是 fill）
    { name: 'stroke', type: 'text', optional: true },
  ];

  public create(id: string, args: Record<string, string>): Line {
    const num = (key: string): number => {
      const raw = args[key];
      return raw === undefined ? 0 : NumberFormat.parseLenient(raw);
    };
    return new Line(id, num('x1'), num('y1'), num('x2'), num('y2'), args['stroke']);
  }
}
