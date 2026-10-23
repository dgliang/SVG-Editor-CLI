import { describe, it, expect } from 'vitest';
import { SvgSerializer } from '../../src/io/SvgSerializer';
import { Document } from '../../src/model/Document';
import { Group } from '../../src/model/Group';
import { Rect } from '../../src/shapes/Rect';
import { Text } from '../../src/shapes/Text';

const HEADER = `<?xml version="1.0" encoding="UTF-8"?>\n`;

function serialize(doc: Document): string {
  return new SvgSerializer().serialize(doc);
}

describe('SvgSerializer', () => {
  it('空画布：固定头 + 空 svg 根 + 末尾换行', () => {
    const doc = new Document(800, 600);
    expect(serialize(doc)).toBe(
      HEADER +
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">\n` +
        `</svg>\n`,
    );
  });

  it('叶子元素自闭合、2 空格缩进、属性顺序 id→几何→样式', () => {
    const doc = new Document(400, 200);
    doc.attach(new Rect('r1', 10, 20, 100, 50, '#eee'), doc.getRoot());
    expect(serialize(doc)).toBe(
      HEADER +
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">\n` +
        `  <rect id="r1" x="10" y="20" width="100" height="50" fill="#eee"/>\n` +
        `</svg>\n`,
    );
  });

  it('text 元素单行双标签，内容是子文本', () => {
    const doc = new Document(400, 200);
    doc.attach(new Text('t1', 20, 40, 'My Diagram'), doc.getRoot());
    const out = serialize(doc);
    expect(out).toContain(`  <text id="t1" x="20" y="40">My Diagram</text>\n`);
  });

  it('空 text 也是双标签而非自闭合', () => {
    const doc = new Document(400, 200);
    doc.attach(new Text('t1', 0, 0, ''), doc.getRoot());
    expect(serialize(doc)).toContain(`<text id="t1" x="0" y="0"></text>`);
  });

  it('空容器自闭合；有子节点的容器递归缩进', () => {
    const doc = new Document(400, 200);
    doc.attach(new Group('empty'), doc.getRoot());
    const g = new Group('flow');
    doc.attach(g, doc.getRoot());
    doc.attach(new Rect('start', 30, 70, 120, 60, '#4a90d9'), g);
    const out = serialize(doc);
    expect(out).toContain(`  <g id="empty"/>\n`);
    expect(out).toContain(
      `  <g id="flow">\n` +
        `    <rect id="start" x="30" y="70" width="120" height="60" fill="#4a90d9"/>\n` +
        `  </g>\n`,
    );
  });

  it('属性转义 & < > "，文本内容转义 & < >', () => {
    const doc = new Document(400, 200);
    const r = new Rect('r', 0, 0, 1, 1);
    r.setAttr('fill', 'a"b&c<d>');
    doc.attach(r, doc.getRoot());
    doc.attach(new Text('t', 0, 0, 'A & <B>'), doc.getRoot());
    const out = serialize(doc);
    expect(out).toContain(`fill="a&quot;b&amp;c&lt;d&gt;"`);
    expect(out).toContain(`>A &amp; &lt;B&gt;</text>`);
  });

  it('数字经 NumberFormat 稳定输出（0.1+0.2 → 0.3）', () => {
    const doc = new Document(400, 200);
    doc.attach(new Rect('r', 0, 0, 0.1 + 0.2, 1), doc.getRoot());
    expect(serialize(doc)).toContain(`width="0.3"`);
  });
});
