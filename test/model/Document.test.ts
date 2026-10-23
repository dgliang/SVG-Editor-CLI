import { describe, it, expect } from 'vitest';
import { Shape } from '../../src/model/Shape';
import { Group } from '../../src/model/Group';
import { Document } from '../../src/model/Document';
import { DomainError } from '../../src/model/DomainError';
import type { ShapeSnapshot } from '../../src/model/ShapeSnapshot';
import type { SvgNodeData } from '../../src/model/SvgNodeData';
import { NumberFormat } from '../../src/model/NumberFormat';

/** 测试用最小叶子图形：一个 x/y/label。 */
class MockLeaf extends Shape {
  public readonly kind = 'mock';
  public x = 0;
  public y = 0;
  public label?: string;

  public constructor(id: string, x = 0, y = 0) {
    super(id);
    this.x = x;
    this.y = y;
  }

  public move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }
  public scale(factor: number): void {
    this.x *= factor;
    this.y *= factor;
  }
  public getAttr(attr: string): string | undefined {
    if (attr === 'x') return NumberFormat.format(this.x);
    if (attr === 'y') return NumberFormat.format(this.y);
    if (attr === 'label') return this.label;
    return undefined;
  }
  public setAttr(attr: string, value: string): void {
    if (attr === 'x') this.x = NumberFormat.parseStrict(value);
    else if (attr === 'y') this.y = NumberFormat.parseStrict(value);
    else if (attr === 'label') this.label = value;
    else throw new DomainError(`unknown attribute: ${attr}`);
  }
  public snapshot(): ShapeSnapshot {
    return { x: this.x, y: this.y, label: this.label };
  }
  public restore(state: ShapeSnapshot): void {
    const s = state as { x: number; y: number; label?: string };
    this.x = s.x;
    this.y = s.y;
    this.label = s.label;
  }
  public treeFields(): string {
    return `x=${NumberFormat.format(this.x)} y=${NumberFormat.format(this.y)}`;
  }
  public detailFields(): string[] {
    const lines = [`x=${NumberFormat.format(this.x)} y=${NumberFormat.format(this.y)}`];
    if (this.label) lines.push(`label="${this.label}"`);
    return lines;
  }
  public toSvgNode(): SvgNodeData {
    const attrs: Record<string, string> = {
      id: this.id,
      x: NumberFormat.format(this.x),
      y: NumberFormat.format(this.y),
    };
    if (this.label) attrs.label = this.label;
    return { tag: 'mock', attrs, children: [] };
  }
}

describe('Document', () => {
  it('defaults to 800x600 and root group id="svg"', () => {
    const doc = new Document();
    expect(doc.getWidth()).toBe(800);
    expect(doc.getHeight()).toBe(600);
    expect(doc.getRoot().id).toBe('svg');
    expect(doc.getFilePath()).toBeNull();
    expect(doc.elementCount()).toBe(0);
  });

  it('setSize rejects non-positive values', () => {
    const doc = new Document();
    expect(() => doc.setSize(0, 100)).toThrow(DomainError);
    expect(() => doc.setSize(-1, 100)).toThrow(DomainError);
    expect(() => doc.setSize(800, -1)).toThrow(DomainError);
  });

  describe('attach / detach / reparent invariants', () => {
    it('attach registers child in index and sets parent', () => {
      const doc = new Document();
      const leaf = new MockLeaf('a', 1, 2);
      doc.attach(leaf, doc.getRoot());
      expect(doc.has('a')).toBe(true);
      expect(doc.find('a')).toBe(leaf);
      expect(leaf.parent).toBe(doc.getRoot());
      expect(doc.getRoot().childCount()).toBe(1);
      expect(doc.elementCount()).toBe(1);
    });

    it('attach at explicit index', () => {
      const doc = new Document();
      const a = new MockLeaf('a');
      const b = new MockLeaf('b');
      doc.attach(a, doc.getRoot());
      doc.attach(b, doc.getRoot(), 0);
      const children = doc.getRoot().readonlyChildren();
      expect(children[0]?.id).toBe('b');
      expect(children[1]?.id).toBe('a');
    });

    it('attach rejects duplicate id', () => {
      const doc = new Document();
      const a1 = new MockLeaf('dup');
      const a2 = new MockLeaf('dup');
      doc.attach(a1, doc.getRoot());
      expect(() => doc.attach(a2, doc.getRoot())).toThrow(DomainError);
    });

    it('attach rejects shapes already attached', () => {
      const doc = new Document();
      const a = new MockLeaf('a');
      doc.attach(a, doc.getRoot());
      expect(() => doc.attach(a, doc.getRoot())).toThrow();
    });

    it('detach unregisters and returns { parent, index }', () => {
      const doc = new Document();
      const a = new MockLeaf('a');
      const b = new MockLeaf('b');
      doc.attach(a, doc.getRoot());
      doc.attach(b, doc.getRoot());
      const info = doc.detach(a);
      expect(info.parent).toBe(doc.getRoot());
      expect(info.index).toBe(0);
      expect(doc.has('a')).toBe(false);
      expect(a.parent).toBeNull();
      expect(doc.elementCount()).toBe(1);
      expect(doc.getRoot().readonlyChildren()[0]?.id).toBe('b');
    });

    it('detach on detached shape throws', () => {
      const doc = new Document();
      const a = new MockLeaf('a');
      expect(() => doc.detach(a)).toThrow();
    });

    it('reparent moves shape between parents and preserves index-less insertion', () => {
      const doc = new Document();
      const g1 = new Group('g1');
      const g2 = new Group('g2');
      const leaf = new MockLeaf('leaf');
      doc.attach(g1, doc.getRoot());
      doc.attach(g2, doc.getRoot());
      doc.attach(leaf, g1);
      doc.reparent(leaf, g2);
      expect(leaf.parent).toBe(g2);
      expect(g1.childCount()).toBe(0);
      expect(g2.childCount()).toBe(1);
      expect(doc.has('leaf')).toBe(true); // index 里只有一份
    });

    it('reparent to same parent is a no-op', () => {
      const doc = new Document();
      const leaf = new MockLeaf('leaf');
      doc.attach(leaf, doc.getRoot());
      doc.reparent(leaf, doc.getRoot()); // 应不抛
      expect(doc.getRoot().childCount()).toBe(1);
    });
  });

  describe('nested structure', () => {
    it('index includes nested children', () => {
      const doc = new Document();
      const g = new Group('g1');
      const a = new MockLeaf('a');
      const b = new MockLeaf('b');
      doc.attach(g, doc.getRoot());
      doc.attach(a, g);
      doc.attach(b, g);
      expect(doc.elementCount()).toBe(3);
      expect(doc.has('a')).toBe(true);
      expect(doc.has('b')).toBe(true);
      expect(doc.find('a').parent).toBe(g);
    });

    it('detach removes entire subtree from index', () => {
      const doc = new Document();
      const g = new Group('g1');
      const a = new MockLeaf('a');
      doc.attach(g, doc.getRoot());
      doc.attach(a, g);
      const info = doc.detach(g);
      expect(info.parent).toBe(doc.getRoot());
      expect(doc.elementCount()).toBe(0);
      expect(doc.has('g1')).toBe(false);
      expect(doc.has('a')).toBe(false);
      expect(g.parent).toBeNull();
      expect(a.parent).toBe(g); // 子节点的 parent 不变（只是脱离文档）
    });
  });

  describe('cycle detection', () => {
    it('reject attaching ancestor into descendant', () => {
      const doc = new Document();
      const g1 = new Group('g1');
      const g2 = new Group('g2');
      doc.attach(g1, doc.getRoot());
      doc.attach(g2, g1);
      // 尝试把 g1 放进 g2：g1 是 g2 的祖先，禁止
      expect(() => doc.reparent(g1, g2)).toThrow(DomainError);
      expect(() => doc.attach(g1, g2)).toThrow(); // g1 还挂载，attach 本身会因已挂载抛
    });
  });

  describe('z-order', () => {
    it('front moves to end of sibling order', () => {
      const doc = new Document();
      const a = new MockLeaf('a');
      const b = new MockLeaf('b');
      const c = new MockLeaf('c');
      doc.attach(a, doc.getRoot());
      doc.attach(b, doc.getRoot());
      doc.attach(c, doc.getRoot());
      doc.zOrder(a, 'front');
      const ids = doc.getRoot().readonlyChildren().map((s) => s.id);
      expect(ids).toEqual(['b', 'c', 'a']);
    });

    it('back moves to start of sibling order', () => {
      const doc = new Document();
      const a = new MockLeaf('a');
      const b = new MockLeaf('b');
      const c = new MockLeaf('c');
      doc.attach(a, doc.getRoot());
      doc.attach(b, doc.getRoot());
      doc.attach(c, doc.getRoot());
      doc.zOrder(c, 'back');
      const ids = doc.getRoot().readonlyChildren().map((s) => s.id);
      expect(ids).toEqual(['c', 'a', 'b']);
    });
  });

  describe('find / has error messages', () => {
    it('find missing throws with exact error message', () => {
      const doc = new Document();
      expect(() => doc.find('nope')).toThrow('no such shape: nope');
    });
  });

  describe('NumberFormat (smoke)', () => {
    it('parseStrict / format round-trip basics', () => {
      expect(NumberFormat.parseStrict('42')).toBe(42);
      expect(NumberFormat.parseStrict('0.5')).toBe(0.5);
      expect(NumberFormat.parseStrict('-0.25')).toBe(-0.25);
      expect(() => NumberFormat.parseStrict('')).toThrow();
      expect(() => NumberFormat.parseStrict('abc')).toThrow();
      expect(() => NumberFormat.parseStrict('10px')).toThrow(); // strict 拒绝带单位
    });
    it('parseLenient tolerates units', () => {
      expect(NumberFormat.parseLenient('10px')).toBe(10);
      expect(NumberFormat.parseLenient('50.5%')).toBeCloseTo(50.5);
      expect(NumberFormat.parseLenient('')).toBe(0);
      expect(NumberFormat.parseLenient('abc')).toBe(0);
    });
    it('format strips trailing zeros and normalises -0', () => {
      expect(NumberFormat.format(0)).toBe('0');
      expect(NumberFormat.format(-0)).toBe('0');
      expect(NumberFormat.format(42)).toBe('42');
      expect(NumberFormat.format(42.5)).toBe('42.5');
      expect(NumberFormat.format(42.0000001)).toBe('42'); // 超过 6 位截断
      expect(NumberFormat.format(-1.5)).toBe('-1.5');
    });
  });
});
