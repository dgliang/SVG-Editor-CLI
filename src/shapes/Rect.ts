import { Shape } from '../model/Shape';
import { DomainError } from '../model/DomainError';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeSnapshot } from '../model/ShapeSnapshot';
import type { SvgNodeData } from '../model/SvgNodeData';
import type { ParamSpec, ShapeProvider } from '../model/ShapeProvider';
import type { Transform2D } from '../model/Transform2D';

/** 公共样式属性的固定输出顺序（序列化与 show 明细一致）。 */
const STYLE_ORDER = ['fill', 'stroke', 'stroke-width'] as const;

interface RectSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  styles: Record<string, string>;
}

/**
 * 矩形。几何：x / y / width / height；样式白名单：fill / stroke / stroke-width。
 * tree 行格式（需求 5.1）：`x=0 y=0 w=800 h=600 fill=#ffffff`（仅 fill 内联）。
 */
export class Rect extends Shape {
  public readonly kind = 'rect';
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private readonly styles = new Map<string, string>();

  public constructor(id: string, x = 0, y = 0, width = 0, height = 0, fill?: string) {
    super(id);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    if (fill !== undefined) this.styles.set('fill', fill);
  }

  public move(dx: number, dy: number): void {
    this.applyTransform({ sx: 1, sy: 1, tx: dx, ty: dy });
  }

  public scale(factor: number): void {
    this.applyTransform({ sx: factor, sy: factor, tx: 0, ty: 0 });
  }

  public applyTransform(t: Transform2D): void {
    this.x = t.sx * this.x + t.tx;
    this.y = t.sy * this.y + t.ty;
    this.width *= Math.abs(t.sx);
    this.height *= Math.abs(t.sy);
  }

  public getAttr(attr: string): string | undefined {
    switch (attr) {
      case 'x': return NumberFormat.format(this.x);
      case 'y': return NumberFormat.format(this.y);
      case 'width': return NumberFormat.format(this.width);
      case 'height': return NumberFormat.format(this.height);
      default: return this.styles.get(attr);
    }
  }

  public setAttr(attr: string, value: string): void {
    switch (attr) {
      case 'x': this.x = NumberFormat.parseStrict(value); return;
      case 'y': this.y = NumberFormat.parseStrict(value); return;
      case 'width': this.width = NumberFormat.parseStrict(value); return;
      case 'height': this.height = NumberFormat.parseStrict(value); return;
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
    const snap: RectSnapshot = { x: this.x, y: this.y, width: this.width, height: this.height, styles };
    return snap;
  }

  public restore(state: ShapeSnapshot): void {
    const s = state as RectSnapshot;
    this.x = s.x;
    this.y = s.y;
    this.width = s.width;
    this.height = s.height;
    this.styles.clear();
    for (const [k, v] of Object.entries(s.styles)) this.styles.set(k, v);
  }

  /** 几何字段（tree 与 show 共用一份，w/h 为显示缩写）。 */
  private geometryFields(): string {
    return `x=${NumberFormat.format(this.x)} y=${NumberFormat.format(this.y)}`
      + ` w=${NumberFormat.format(this.width)} h=${NumberFormat.format(this.height)}`;
  }

  public treeFields(): string {
    // tree 行只内联几何 + fill（需求 5.1 transcript；line 的 stroke 不显示同此规则）
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
      x: NumberFormat.format(this.x),
      y: NumberFormat.format(this.y),
      width: NumberFormat.format(this.width),
      height: NumberFormat.format(this.height),
    };
    for (const key of STYLE_ORDER) {
      const v = this.styles.get(key);
      if (v !== undefined) attrs[key] = v;
    }
    return { tag: 'rect', attrs, children: [] };
  }
}

/**
 * rect 的 provider。create 用宽松解析（io 读入缺失/带单位属性取 0），
 * create 命令侧的严格校验由 handler 按 params 完成。
 */
export class RectProvider implements ShapeProvider {
  public readonly kind = 'rect';
  public readonly container = false;
  public readonly params: readonly ParamSpec[] = [
    { name: 'x', type: 'number', optional: false },
    { name: 'y', type: 'number', optional: false },
    { name: 'width', type: 'number', optional: false },
    { name: 'height', type: 'number', optional: false },
    { name: 'fill', type: 'text', optional: true },
  ];

  public create(id: string, args: Record<string, string>): Rect {
    const num = (key: string): number => {
      const raw = args[key];
      return raw === undefined ? 0 : NumberFormat.parseLenient(raw);
    };
    return new Rect(id, num('x'), num('y'), num('width'), num('height'), args['fill']);
  }
}
