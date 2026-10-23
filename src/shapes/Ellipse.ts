import { Shape } from '../model/Shape';
import { DomainError } from '../model/DomainError';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeSnapshot } from '../model/ShapeSnapshot';
import type { SvgNodeData } from '../model/SvgNodeData';
import type { ParamSpec, ShapeProvider } from '../model/ShapeProvider';

const STYLE_ORDER = ['fill', 'stroke', 'stroke-width'] as const;

interface EllipseSnapshot {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  styles: Record<string, string>;
}

/** 椭圆。几何：cx / cy / rx / ry；tree 行格式：`cx=1 cy=2 rx=3 ry=4`。 */
export class Ellipse extends Shape {
  public readonly kind = 'ellipse';
  private cx: number;
  private cy: number;
  private rx: number;
  private ry: number;
  private readonly styles = new Map<string, string>();

  public constructor(id: string, cx = 0, cy = 0, rx = 0, ry = 0, fill?: string) {
    super(id);
    this.cx = cx;
    this.cy = cy;
    this.rx = rx;
    this.ry = ry;
    if (fill !== undefined) this.styles.set('fill', fill);
  }

  public move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  public scale(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.rx *= factor;
    this.ry *= factor;
  }

  public getAttr(attr: string): string | undefined {
    switch (attr) {
      case 'cx': return NumberFormat.format(this.cx);
      case 'cy': return NumberFormat.format(this.cy);
      case 'rx': return NumberFormat.format(this.rx);
      case 'ry': return NumberFormat.format(this.ry);
      default: return this.styles.get(attr);
    }
  }

  public setAttr(attr: string, value: string): void {
    switch (attr) {
      case 'cx': this.cx = NumberFormat.parseStrict(value); return;
      case 'cy': this.cy = NumberFormat.parseStrict(value); return;
      case 'rx': this.rx = NumberFormat.parseStrict(value); return;
      case 'ry': this.ry = NumberFormat.parseStrict(value); return;
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
    const snap: EllipseSnapshot = { cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry, styles };
    return snap;
  }

  public restore(state: ShapeSnapshot): void {
    const s = state as EllipseSnapshot;
    this.cx = s.cx;
    this.cy = s.cy;
    this.rx = s.rx;
    this.ry = s.ry;
    this.styles.clear();
    for (const [k, v] of Object.entries(s.styles)) this.styles.set(k, v);
  }

  private geometryFields(): string {
    return `cx=${NumberFormat.format(this.cx)} cy=${NumberFormat.format(this.cy)}`
      + ` rx=${NumberFormat.format(this.rx)} ry=${NumberFormat.format(this.ry)}`;
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
      cx: NumberFormat.format(this.cx),
      cy: NumberFormat.format(this.cy),
      rx: NumberFormat.format(this.rx),
      ry: NumberFormat.format(this.ry),
    };
    for (const key of STYLE_ORDER) {
      const v = this.styles.get(key);
      if (v !== undefined) attrs[key] = v;
    }
    return { tag: 'ellipse', attrs, children: [] };
  }
}

export class EllipseProvider implements ShapeProvider {
  public readonly kind = 'ellipse';
  public readonly container = false;
  public readonly params: readonly ParamSpec[] = [
    { name: 'cx', type: 'number', optional: false },
    { name: 'cy', type: 'number', optional: false },
    { name: 'rx', type: 'number', optional: false },
    { name: 'ry', type: 'number', optional: false },
    { name: 'fill', type: 'text', optional: true },
  ];

  public create(id: string, args: Record<string, string>): Ellipse {
    const num = (key: string): number => {
      const raw = args[key];
      return raw === undefined ? 0 : NumberFormat.parseLenient(raw);
    };
    return new Ellipse(id, num('cx'), num('cy'), num('rx'), num('ry'), args['fill']);
  }
}
