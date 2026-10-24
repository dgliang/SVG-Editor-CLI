import { describe, it, expect } from 'vitest';
import { Document } from '../../src/model/Document';
import { Group } from '../../src/model/Group';
import { Circle } from '../../src/shapes/Circle';
import { Rect } from '../../src/shapes/Rect';
import { Text } from '../../src/shapes/Text';
import { ShapeDetailRenderer } from '../../src/view/ShapeDetailRenderer';

describe('ShapeDetailRenderer', () => {
  it('需求 5.2 示例：首行 parent=g#id，几何一行、样式各一行', () => {
    const doc = new Document();
    const markers = new Group('markers');
    doc.attach(markers, doc.getRoot());
    doc.attach(new Circle('c1', 100, 100, 20, 'red'), markers);

    expect(new ShapeDetailRenderer().render(doc.find('c1'))).toEqual([
      'circle#c1  parent=g#markers',
      '  cx=100 cy=100 r=20',
      '  fill=red',
    ]);
  });

  it('根级图形的父级标签为 svg；缺省属性不输出', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 10, 20, 100, 50), doc.getRoot());
    expect(new ShapeDetailRenderer().render(doc.find('r1'))).toEqual([
      'rect#r1  parent=svg',
      '  x=10 y=20 w=100 h=50',
    ]);
  });

  it('text 元素追加 text="..."（含空串）', () => {
    const doc = new Document();
    doc.attach(new Text('t1', 20, 40, 'My Diagram'), doc.getRoot());
    expect(new ShapeDetailRenderer().render(doc.find('t1'))).toEqual([
      'text#t1  parent=svg',
      '  (20,40)',
      '  text="My Diagram"',
    ]);

    doc.attach(new Text('t2', 0, 0, ''), doc.getRoot());
    expect(new ShapeDetailRenderer().render(doc.find('t2'))).toContain('  text=""');
  });

  it('容器追加 children=<n>', () => {
    const doc = new Document();
    const markers = new Group('markers');
    doc.attach(markers, doc.getRoot());
    doc.attach(new Circle('c1', 0, 0, 1), markers);
    doc.attach(new Circle('c2', 0, 0, 1), markers);
    expect(new ShapeDetailRenderer().render(doc.find('markers'))).toEqual([
      'g#markers  parent=svg',
      '  children=2',
    ]);
  });
});
