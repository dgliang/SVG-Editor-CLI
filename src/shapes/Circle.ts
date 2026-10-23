import { Shape } from '../model/Shape';
import { DomainError } from '../model/DomainError';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeSnapshot } from '../model/ShapeSnapshot';
import type { SvgNodeData } from '../model/SvgNodeData';
import type { ParamSpec, ShapeProvider } from '../model/ShapeProvider';
import type { Transform2D } from '../model/Transform2D';

const STYLE_ORDER = ['fill', 'stroke', 'stroke-width'] as const;

interface CircleSnapshot {
  cx: number;
  cy: number;
  r: number;
  styles: Record<string, string>;
}

/** 圆形。几何：cx / cy / r；tree 行格式：`cx=100 cy=100 r=20 fill=red`。 */
export class Circle extends Shape {
  public readonly kind = 'circle';
  private cx: number;
  private cy: number;
  private r: number;
  private readonly styles = new Map<string, string>();

  public constructor(id: string, cx = 0, cy = 0, r = 0, fill?: string) {
    super(id);
    this.cx = cx;
    this.cy = cy;
    this.r = r;
    if (fill !== undefined) this.styles.set('fill', fill);
  }

  public move(dx: number, dy: number): void {
    this.applyTransform({ sx: 1, sy: 1, tx: dx, ty: dy });
  }

  public scale(factor: number): void {
    this.applyTransform({ sx: factor, sy: factor, tx: 0, ty: 0 });
  }

  public applyTransform(t: Transform2D): void {
    this.cx = t.sx * this.cx + t.tx;
    this.cy = t.sy * this.cy + t.ty;
    // 非等比缩放无法被 circle 表示（会变成椭圆），取两轴均值近似
    this.r *= (Math.abs(t.sx) + Math.abs(t.sy)) / 2;
  }

  public getAttr(attr: string): string | undefined {
    switch (attr) {
      case 'cx': return NumberFormat.format(this.cx);
      case 'cy': return NumberFormat.format(this.cy);
      case 'r': return NumberFormat.format(this.r);
      default: return this.styles.get(attr);
    }
  }

  public setAttr(attr: string, value: string): void {
    switch (attr) {
      case 'cx': this.cx = NumberFormat.parseStrict(value); return;
      case 'cy': this.cy = NumberFormat.parseStrict(value); return;
      case 'r': this.r = NumberFormat.parseStrict(value); return;
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
    const snap: CircleSnapshot = { cx: this.cx, cy: this.cy, r: this.r, styles };
    return snap;
  }

  public restore(state: ShapeSnapshot): void {
    const s = state as CircleSnapshot;
    this.cx = s.cx;
    this.cy = s.cy;
    this.r = s.r;
    this.styles.clear();
    for (const [k, v] of Object.entries(s.styles)) this.styles.set(k, v);
  }

  private geometryFields(): string {
    return `cx=${NumberFormat.format(this.cx)} cy=${NumberFormat.format(this.cy)} r=${NumberFormat.format(this.r)}`;
  }

  public treeFields(): string {
    const fill = this.styles.get('fill');
    return fill !== undefined ? `${this.geometryFields()} fill=${fill}` : this.geometryFields();
  }

  public positionAnchor(): string {
    return `(${NumberFormat.format(this.cx)},${NumberFormat.format(this.cy)})`;
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
      cx: NumberFormat.format(this.cx),
      cy: NumberFormat.format(this.cy),
      r: NumberFormat.format(this.r),
    };
    for (const key of STYLE_ORDER) {
      const v = this.styles.get(key);
      if (v !== undefined) attrs[key] = v;
    }
    return { tag: 'circle', attrs, children: [] };
  }
}

export class CircleProvider implements ShapeProvider {
  public readonly kind = 'circle';
  public readonly container = false;
  public readonly params: readonly ParamSpec[] = [
    { name: 'cx', type: 'number', optional: false },
    { name: 'cy', type: 'number', optional: false },
    { name: 'r', type: 'number', optional: false },
    { name: 'fill', type: 'text', optional: true },
  ];

  public create(id: string, args: Record<string, string>): Circle {
    const num = (key: string): number => {
      const raw = args[key];
      return raw === undefined ? 0 : NumberFormat.parseLenient(raw);
    };
    return new Circle(id, num('cx'), num('cy'), num('r'), args['fill']);
  }
}
