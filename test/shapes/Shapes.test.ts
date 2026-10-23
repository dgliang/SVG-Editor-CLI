import { describe, it, expect } from 'vitest';
import { ShapeRegistry } from '../../src/model/ShapeRegistry';
import { DomainError } from '../../src/model/DomainError';
import { BuiltinShapes } from '../../src/shapes/BuiltinShapes';
import { Rect } from '../../src/shapes/Rect';
import { Circle } from '../../src/shapes/Circle';
import { Ellipse } from '../../src/shapes/Ellipse';
import { Line } from '../../src/shapes/Line';
import { Text } from '../../src/shapes/Text';

function makeRegistry(): ShapeRegistry {
  const registry = new ShapeRegistry();
  BuiltinShapes.register(registry);
  return registry;
}

describe('BuiltinShapes registry', () => {
  it('registers rect/circle/ellipse/line/text/g', () => {
    const registry = makeRegistry();
    expect(registry.kinds().sort()).toEqual(['circle', 'ellipse', 'g', 'line', 'rect', 'text']);
  });

  it('g provider is a container with no params', () => {
    const g = makeRegistry().get('g');
    expect(g.container).toBe(true);
    expect(g.params).toEqual([]);
    const node = g.create('g1', {});
    expect(node.isContainer).toBe(true);
    expect(node.kind).toBe('g');
  });

  it('unknown kind throws DomainError with plugin hint', () => {
    expect(() => makeRegistry().get('box')).toThrow(DomainError);
    expect(() => makeRegistry().get('box')).toThrow('unknown shape type: box (is the plugin loaded?)');
  });

  it('leaf providers are not containers', () => {
    const registry = makeRegistry();
    for (const kind of ['rect', 'circle', 'ellipse', 'line', 'text']) {
      expect(registry.get(kind).container).toBe(false);
    }
  });
});

describe('Rect', () => {
  it('provider creates from CLI args and optional fill', () => {
    const rect = makeRegistry().get('rect').create('bg', {
      x: '0', y: '0', width: '800', height: '600', fill: '#ffffff',
    });
    expect(rect.kind).toBe('rect');
    expect(rect.treeFields()).toBe('x=0 y=0 w=800 h=600 fill=#ffffff');
  });

  it('provider tolerates missing/invalid numbers (io path)', () => {
    const provider = makeRegistry().get('rect');
    const empty = provider.create('r', {});
    expect(empty.treeFields()).toBe('x=0 y=0 w=0 h=0');
    const unit = provider.create('r', { x: '10px', width: 'abc' });
    expect(unit.treeFields()).toBe('x=10 y=0 w=0 h=0');
  });

  it('move / scale update geometry', () => {
    const rect = new Rect('r', 10, 20, 100, 50);
    rect.move(5, -5);
    expect(rect.treeFields()).toBe('x=15 y=15 w=100 h=50');
    rect.scale(2);
    expect(rect.treeFields()).toBe('x=30 y=30 w=200 h=100');
  });

  it('setAttr accepts whitelist and rejects unknown attributes', () => {
    const rect = new Rect('r', 0, 0, 10, 10);
    rect.setAttr('x', '42');
    rect.setAttr('fill', 'red');
    rect.setAttr('stroke-width', '2');
    expect(rect.getAttr('x')).toBe('42');
    expect(rect.getAttr('fill')).toBe('red');
    expect(rect.getAttr('stroke-width')).toBe('2');
    expect(() => rect.setAttr('opacity', '0.5')).toThrow(DomainError);
    expect(() => rect.setAttr('opacity', '0.5')).toThrow('unknown attribute: opacity');
    expect(() => rect.setAttr('w', '5')).toThrow('unknown attribute: w'); // w 只是显示缩写
  });

  it('setAttr rejects invalid numbers with domain message', () => {
    const rect = new Rect('r');
    expect(() => rect.setAttr('x', 'abc')).toThrow('invalid number: abc');
    expect(() => rect.setAttr('x', '10px')).toThrow('invalid number: 10px');
  });

  it('snapshot / restore round-trips geometry and styles', () => {
    const rect = new Rect('r', 1, 2, 3, 4, 'red');
    rect.setAttr('stroke', 'black');
    const snap = rect.snapshot();
    rect.move(10, 10);
    rect.scale(3);
    rect.setAttr('fill', 'blue');
    rect.restore(snap);
    expect(rect.treeFields()).toBe('x=1 y=2 w=3 h=4 fill=red');
    expect(rect.getAttr('stroke')).toBe('black');
  });

  it('toSvgNode emits id, geometry, styles in stable order and omits defaults', () => {
    const rect = new Rect('r', 1.5, 2, 3, 4, 'red');
    rect.setAttr('stroke-width', '0.5');
    const node = rect.toSvgNode();
    expect(node.tag).toBe('rect');
    expect(Object.keys(node.attrs)).toEqual(['id', 'x', 'y', 'width', 'height', 'fill', 'stroke-width']);
    expect(node.attrs.x).toBe('1.5');
    expect(node.children).toEqual([]);
  });

  it('detailFields puts geometry on first line then one style per line', () => {
    const rect = new Rect('r', 0, 0, 10, 10, 'red');
    expect(rect.detailFields()).toEqual(['x=0 y=0 w=10 h=10', 'fill=red']);
  });
});

describe('Circle', () => {
  it('creates via provider and formats like the transcript', () => {
    const c = makeRegistry().get('circle').create('c1', { cx: '100', cy: '100', r: '20', fill: 'red' });
    expect(c.treeFields()).toBe('cx=100 cy=100 r=20 fill=red');
  });

  it('move / scale', () => {
    const c = new Circle('c', 100, 100, 20);
    c.move(30, 0);
    expect(c.treeFields()).toBe('cx=130 cy=100 r=20');
    c.scale(0.5);
    expect(c.treeFields()).toBe('cx=65 cy=50 r=10');
  });

  it('whitelist rejects rect-only geometry', () => {
    const c = new Circle('c');
    expect(() => c.setAttr('width', '5')).toThrow('unknown attribute: width');
  });

  it('snapshot / restore round-trip', () => {
    const c = new Circle('c', 1, 2, 3, 'red');
    const snap = c.snapshot();
    c.scale(10);
    c.restore(snap);
    expect(c.treeFields()).toBe('cx=1 cy=2 r=3 fill=red');
  });

  it('toSvgNode attributes', () => {
    const node = new Circle('c', 1, 2, 3).toSvgNode();
    expect(Object.keys(node.attrs)).toEqual(['id', 'cx', 'cy', 'r']);
  });
});

describe('Ellipse', () => {
  it('creates via provider and formats like the transcript', () => {
    const e = makeRegistry().get('ellipse').create('e1', { cx: '1', cy: '2', rx: '3', ry: '4' });
    expect(e.treeFields()).toBe('cx=1 cy=2 rx=3 ry=4');
  });

  it('move / scale', () => {
    const e = new Ellipse('e', 1, 2, 3, 4);
    e.move(1, 1);
    e.scale(2);
    expect(e.treeFields()).toBe('cx=4 cy=6 rx=6 ry=8');
  });

  it('snapshot / restore round-trip', () => {
    const e = new Ellipse('e', 1, 2, 3, 4);
    const snap = e.snapshot();
    e.move(9, 9);
    e.restore(snap);
    expect(e.treeFields()).toBe('cx=1 cy=2 rx=3 ry=4');
  });
});

describe('Line', () => {
  it('provider takes optional stroke (not fill) per spec 4.1', () => {
    const provider = makeRegistry().get('line');
    expect(provider.params.map((p) => p.name)).toEqual(['x1', 'y1', 'x2', 'y2', 'stroke']);
    const line = provider.create('arrow1', { x1: '280', y1: '130', x2: '520', y2: '130', stroke: 'black' });
    // tree 不内联 stroke（需求 6.1 transcript）
    expect(line.treeFields()).toBe('(280,130) -> (520,130)');
    expect(line.getAttr('stroke')).toBe('black');
  });

  it('move shifts both endpoints; scale multiplies all four', () => {
    const line = new Line('l', 0, 0, 10, 20);
    line.move(5, 5);
    expect(line.treeFields()).toBe('(5,5) -> (15,25)');
    line.scale(2);
    expect(line.treeFields()).toBe('(10,10) -> (30,50)');
  });

  it('detailFields shows stroke on its own line when set', () => {
    const line = new Line('l', 0, 0, 1, 1, 'black');
    expect(line.detailFields()).toEqual(['(0,0) -> (1,1)', 'stroke=black']);
  });

  it('snapshot / restore round-trip', () => {
    const line = new Line('l', 1, 2, 3, 4, 'black');
    const snap = line.snapshot();
    line.move(1, 1);
    line.restore(snap);
    expect(line.treeFields()).toBe('(1,2) -> (3,4)');
    expect(line.getAttr('stroke')).toBe('black');
  });
});

describe('Text', () => {
  it('creates via provider and formats like the transcript', () => {
    const t = makeRegistry().get('text').create('title', { x: '20', y: '40', text: 'My Diagram' });
    expect(t.treeFields()).toBe('(20,40) "My Diagram"');
  });

  it('text content is an attribute for set/get but not an SVG attribute', () => {
    const t = new Text('t', 1, 2, 'hi');
    t.setAttr('text', 'hello world');
    expect(t.getAttr('text')).toBe('hello world');
    const node = t.toSvgNode();
    expect(node.attrs.text).toBeUndefined();
    expect(node.text).toBe('hello world');
    expect(node.tag).toBe('text');
  });

  it('move / scale only affect x/y', () => {
    const t = new Text('t', 10, 20, 's');
    t.move(1, 1);
    t.scale(2);
    expect(t.treeFields()).toBe('(22,42) "s"');
  });

  it('detailFields appends text="..." after geometry and styles', () => {
    const t = new Text('t', 20, 40, 'My Diagram');
    t.setAttr('fill', 'white');
    expect(t.detailFields()).toEqual(['(20,40)', 'fill=white', 'text="My Diagram"']);
  });

  it('snapshot / restore round-trips text too', () => {
    const t = new Text('t', 1, 2, 'v1');
    const snap = t.snapshot();
    t.setAttr('text', 'v2');
    t.move(5, 5);
    t.restore(snap);
    expect(t.treeFields()).toBe('(1,2) "v1"');
  });
});

describe('floating point stability', () => {
  it('formats scaled values without noise or -0', () => {
    const c = new Circle('c', 33.3333333333, -0, 1);
    expect(c.treeFields()).toBe('cx=33.333333 cy=0 r=1');
    c.scale(0.3);
    // 33.333333 * 0.3 = 9.9999999 → toFixed(6) 四舍五入为 10.000000 → 去尾随零
    expect(c.getAttr('cx')).toBe('10');
  });
});
