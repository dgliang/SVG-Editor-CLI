import { describe, it, expect } from 'vitest';
import { SvgParser } from '../../src/io/SvgParser';
import { SvgSerializer } from '../../src/io/SvgSerializer';
import type { Document } from '../../src/model/Document';
import type { Group } from '../../src/model/Group';
import type { Shape } from '../../src/model/Shape';
import { ShapeRegistry } from '../../src/model/ShapeRegistry';
import { BuiltinShapes } from '../../src/shapes/BuiltinShapes';

function makeRegistry(): ShapeRegistry {
  const r = new ShapeRegistry();
  BuiltinShapes.register(r);
  return r;
}

function parse(text: string): Document {
  return new SvgParser().parse(text, makeRegistry()).doc;
}

/** 结构等价：kind / id / treeFields / 子节点递归一致。 */
function expectSameShape(a: Shape, b: Shape): void {
  expect(b.kind).toBe(a.kind);
  expect(b.id).toBe(a.id);
  expect(b.treeFields()).toBe(a.treeFields());
  const ac = a.isContainer ? (a as Group).readonlyChildren() : [];
  const bc = b.isContainer ? (b as Group).readonlyChildren() : [];
  expect(bc.length).toBe(ac.length);
  for (let i = 0; i < ac.length; i++) {
    expectSameShape(ac[i] as Shape, bc[i] as Shape);
  }
}

const FLOW_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <g id="flow">
    <rect id="start" x="30" y="70" width="120" height="60" fill="#4a90d9"/>
    <line id="edge" x1="150" y1="100" x2="250" y2="100" stroke="black"/>
    <rect id="end" x="250" y="70" width="120" height="60" fill="#f5a623"/>
  </g>
</svg>
`;

const TRANSFORM_SVG = `<svg width="400" height="200">
  <g id="diagram" transform="translate(60,40)">
    <g id="nodeB" transform="translate(200,0) scale(0.8)">
      <rect id="b" x="0" y="0" width="120" height="60" fill="#f5a623"/>
      <text id="lbl" x="60" y="38">End</text>
    </g>
  </g>
</svg>
`;

describe('round-trip: parse → serialize → parse', () => {
  it.each([
    ['flow 示例', FLOW_SVG],
    ['嵌套 transform 扁平化', TRANSFORM_SVG],
  ])('%s：结构等价且序列化输出稳定', (_label, svg) => {
    const serializer = new SvgSerializer();
    const doc1 = parse(svg);
    const out1 = serializer.serialize(doc1);
    const doc2 = parse(out1);
    const out2 = serializer.serialize(doc2);

    expect(doc2.elementCount()).toBe(doc1.elementCount());
    expect(doc2.getWidth()).toBe(doc1.getWidth());
    expect(doc2.getHeight()).toBe(doc1.getHeight());
    const c1 = doc1.getRoot().readonlyChildren();
    const c2 = doc2.getRoot().readonlyChildren();
    expect(c2.length).toBe(c1.length);
    for (let i = 0; i < c1.length; i++) {
      expectSameShape(c1[i] as Shape, c2[i] as Shape);
    }
    // 二次序列化字节级一致（transform 已扁平化，不会重复叠加）
    expect(out2).toBe(out1);
  });
});
