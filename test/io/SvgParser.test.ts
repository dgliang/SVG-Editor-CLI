import { describe, it, expect } from 'vitest';
import { SvgParser } from '../../src/io/SvgParser';
import { DomainError } from '../../src/model/DomainError';
import { ShapeRegistry } from '../../src/model/ShapeRegistry';
import { BuiltinShapes } from '../../src/shapes/BuiltinShapes';

function makeRegistry(): ShapeRegistry {
  const r = new ShapeRegistry();
  BuiltinShapes.register(r);
  return r;
}

function parse(text: string) {
  return new SvgParser().parse(text, makeRegistry());
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

describe('SvgParser 基本解析', () => {
  it('解析需求 0.1 的 flow 示例：结构、坐标、样式', () => {
    const { doc, warnings } = parse(FLOW_SVG);
    expect(warnings).toEqual([]);
    expect(doc.getWidth()).toBe(400);
    expect(doc.getHeight()).toBe(200);
    expect(doc.elementCount()).toBe(4); // g + 3 叶子

    const flow = doc.find('flow');
    expect(flow.isContainer).toBe(true);
    expect(flow.parent).toBe(doc.getRoot());

    const start = doc.find('start');
    expect(start.getAttr('x')).toBe('30');
    expect(start.getAttr('y')).toBe('70');
    expect(start.getAttr('width')).toBe('120');
    expect(start.getAttr('height')).toBe('60');
    expect(start.getAttr('fill')).toBe('#4a90d9');
    expect(start.parent).toBe(flow);

    const edge = doc.find('edge');
    expect(edge.getAttr('x1')).toBe('150');
    expect(edge.getAttr('stroke')).toBe('black');
  });

  it('text 元素的文本内容是子文本而非属性', () => {
    const { doc } = parse(
      `<svg width="100" height="100"><text id="t" x="1" y="2">Hello &amp; Bye</text></svg>`,
    );
    expect(doc.find('t').getAttr('text')).toBe('Hello & Bye');
  });
});

describe('SvgParser 容错', () => {
  it('缺 id 自动补：标签名+序号，并警告', () => {
    const { doc, warnings } = parse(
      `<svg width="100" height="100"><rect x="1" y="2" width="3" height="4"/><rect/></svg>`,
    );
    expect(warnings).toEqual([
      'warning: assigned id rect1 to unnamed <rect>',
      'warning: assigned id rect2 to unnamed <rect>',
    ]);
    expect(doc.has('rect1')).toBe(true);
    expect(doc.has('rect2')).toBe(true);
  });

  it('自动补 id 跳过已占用的名字', () => {
    const { doc, warnings } = parse(
      `<svg width="100" height="100"><rect id="rect1"/><rect/></svg>`,
    );
    expect(warnings).toEqual(['warning: assigned id rect2 to unnamed <rect>']);
    expect(doc.has('rect2')).toBe(true);
  });

  it('重复 id 重命名为 id_2 并警告', () => {
    const { doc, warnings } = parse(
      `<svg width="100" height="100"><rect id="r1"/><rect id="r1"/><rect id="r1"/></svg>`,
    );
    expect(warnings).toEqual([
      'warning: duplicate id r1 renamed to r1_2',
      'warning: duplicate id r1 renamed to r1_3',
    ]);
    expect(doc.has('r1')).toBe(true);
    expect(doc.has('r1_2')).toBe(true);
    expect(doc.has('r1_3')).toBe(true);
  });

  it('不支持的标签跳过整棵子树并警告', () => {
    const { doc, warnings } = parse(
      `<svg width="100" height="100"><path d="M0 0"><rect id="inner"/></path><rect id="keep"/></svg>`,
    );
    expect(warnings).toEqual(['warning: unsupported element <path> skipped']);
    expect(doc.has('inner')).toBe(false);
    expect(doc.has('keep')).toBe(true);
  });

  it('title/desc/注释静默跳过，不产生警告', () => {
    const { doc, warnings } = parse(
      `<svg width="100" height="100"><title>t</title><desc>d</desc><!-- c --><rect id="r"/></svg>`,
    );
    expect(warnings).toEqual([]);
    expect(doc.elementCount()).toBe(1);
  });

  it('属性值宽松解析：10px 取 10，缺失取 0', () => {
    const { doc } = parse(
      `<svg width="100" height="100"><rect id="r" x="10px" width="50%"/></svg>`,
    );
    expect(doc.find('r').getAttr('x')).toBe('10');
    expect(doc.find('r').getAttr('width')).toBe('50');
    expect(doc.find('r').getAttr('y')).toBe('0');
  });
});

describe('SvgParser transform 扁平化', () => {
  it('嵌套 translate/scale 组合到叶子几何（需求 0.1 第二个示例）', () => {
    const { doc, warnings } = parse(
      `<svg width="400" height="200">
  <g id="diagram" transform="translate(60,40)">
    <g id="nodeB" transform="translate(200,0) scale(0.8)">
      <rect id="b" x="0" y="0" width="120" height="60" fill="#f5a623"/>
      <text id="lbl" x="60" y="38">End</text>
    </g>
  </g>
</svg>`,
    );
    expect(warnings).toEqual([]);
    const b = doc.find('b');
    expect(b.getAttr('x')).toBe('260'); // 60 + 200
    expect(b.getAttr('y')).toBe('40');
    expect(b.getAttr('width')).toBe('96'); // 120 * 0.8
    expect(b.getAttr('height')).toBe('48');
    const lbl = doc.find('lbl');
    expect(lbl.getAttr('x')).toBe('308'); // 260 + 0.8*60
    expect(lbl.getAttr('y')).toBe('70.4'); // 40 + 0.8*38
  });

  it('scale(s) 单参数同乘两轴；translate(dx) 缺省 dy=0', () => {
    const { doc } = parse(
      `<svg width="100" height="100"><g id="g" transform="translate(5) scale(2)"><rect id="r" x="10" y="20" width="30" height="40"/></g></svg>`,
    );
    const r = doc.find('r');
    expect(r.getAttr('x')).toBe('25'); // 5 + 2*10
    expect(r.getAttr('y')).toBe('40'); // 0 + 2*20
    expect(r.getAttr('width')).toBe('60');
  });

  it('含 rotate 的 transform 整层按单位阵处理并警告（原文保留）', () => {
    const { doc, warnings } = parse(
      `<svg width="100" height="100"><g id="g1" transform="rotate(30)"><rect id="r" x="10" y="20" width="30" height="40"/></g></svg>`,
    );
    expect(warnings).toEqual(['warning: unsupported transform "rotate(30)" ignored']);
    expect(doc.find('r').getAttr('x')).toBe('10');
    expect(doc.find('r').getAttr('y')).toBe('20');
  });

  it('translate 混 rotate：整段警告、整层单位阵', () => {
    const { doc, warnings } = parse(
      `<svg width="100" height="100"><g id="g1" transform="translate(10,20) rotate(30)"><rect id="r" x="1" y="1" width="1" height="1"/></g></svg>`,
    );
    expect(warnings).toEqual(['warning: unsupported transform "translate(10,20) rotate(30)" ignored']);
    expect(doc.find('r').getAttr('x')).toBe('1');
  });
});

describe('SvgParser 画布尺寸与错误', () => {
  it('尺寸三来源：width/height 属性 > viewBox > 缺省 800x600', () => {
    expect(parse(`<svg width="10px" height="20px"/>`).doc.getWidth()).toBe(10);
    expect(parse(`<svg width="10px" height="20px"/>`).doc.getHeight()).toBe(20);

    const fromViewBox = parse(`<svg viewBox="0 0 640 480"><rect id="r"/></svg>`);
    expect(fromViewBox.doc.getWidth()).toBe(640);
    expect(fromViewBox.doc.getHeight()).toBe(480);

    const fallback = parse(`<svg><rect id="r"/></svg>`);
    expect(fallback.doc.getWidth()).toBe(800);
    expect(fallback.doc.getHeight()).toBe(600);
  });

  it('根元素不是 svg 抛 invalid SVG: root element is not <svg>', () => {
    expect(() => parse(`<html></html>`)).toThrow(DomainError);
    expect(() => parse(`<html></html>`)).toThrow('invalid SVG: root element is not <svg>');
  });

  it('XML 语法错误抛 invalid SVG: ...', () => {
    expect(() => parse(`<svg><rect></svg>`)).toThrow(DomainError);
    expect(() => parse(`<svg><rect></svg>`)).toThrow(/^invalid SVG: /);
  });
});
