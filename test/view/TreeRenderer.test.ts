import { describe, it, expect } from 'vitest';
import { Document } from '../../src/model/Document';
import { Group } from '../../src/model/Group';
import { Circle } from '../../src/shapes/Circle';
import { Line } from '../../src/shapes/Line';
import { Rect } from '../../src/shapes/Rect';
import { Text } from '../../src/shapes/Text';
import { TreeRenderer } from '../../src/view/TreeRenderer';

function makeDoc(): Document {
  const doc = new Document(800, 600);
  doc.attach(new Rect('bg', 0, 0, 800, 600, '#ffffff'), doc.getRoot());
  doc.attach(new Text('title', 20, 40, 'My Diagram'), doc.getRoot());
  const markers = new Group('markers');
  doc.attach(markers, doc.getRoot());
  doc.attach(new Circle('c1', 100, 100, 20, 'red'), markers);
  doc.attach(new Rect('box', 200, 80, 60, 60, '#3366ff'), markers);
  return doc;
}

describe('TreeRenderer', () => {
  it('全文档输出与需求 5.1 示例逐字一致', () => {
    const lines = new TreeRenderer().render(makeDoc());
    expect(lines).toEqual([
      'svg (800x600)',
      '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title     (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('空文档只输出根行', () => {
    expect(new TreeRenderer().render(new Document(320, 240))).toEqual(['svg (320x240)']);
  });

  it('tree <id>：以该节点为根重画，根行无连接符', () => {
    const doc = makeDoc();
    const lines = new TreeRenderer().renderSubtree(doc.find('markers'));
    expect(lines).toEqual([
      'g#markers',
      '├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('tree 叶子：单行，字段前 2 空格', () => {
    const doc = makeDoc();
    expect(new TreeRenderer().renderSubtree(doc.find('c1'))).toEqual([
      'circle#c1  cx=100 cy=100 r=20 fill=red',
    ]);
  });

  it('多层嵌套连接符：│ 前缀随非末尾父节点延续', () => {
    const doc = new Document(800, 600);
    const flow = new Group('flowchart');
    doc.attach(flow, doc.getRoot());
    const n1 = new Group('node1');
    doc.attach(n1, flow);
    doc.attach(new Rect('start', 120, 100, 160, 60, '#4a90d9'), n1);
    doc.attach(new Text('start-label', 155, 135, '开始'), n1);
    const n2 = new Group('node2');
    doc.attach(n2, flow);
    doc.attach(new Rect('process', 520, 100, 160, 60, '#f5a623'), n2);
    doc.attach(new Text('process-label', 545, 135, '处理数据'), n2);
    doc.attach(new Line('arrow1', 280, 130, 520, 130), flow);

    const lines = new TreeRenderer().render(doc);
    expect(lines[0]).toBe('svg (800x600)');
    expect(lines[1]).toBe('└── g#flowchart');
    expect(lines[2]).toBe('    ├── g#node1');
    expect(lines[3]?.startsWith('    │   ├── rect#start')).toBe(true);
    expect(lines[4]?.startsWith('    │   └── text#start-label')).toBe(true);
    expect(lines[5]).toBe('    ├── g#node2');
    expect(lines[6]?.startsWith('    │   ├── rect#process')).toBe(true);
    expect(lines[7]?.startsWith('    │   └── text#process-label')).toBe(true);
    expect(lines[8]?.startsWith('    └── line#arrow1')).toBe(true);
    expect(lines[8]).toContain('(280,130) -> (520,130)');
  });

  it('字段对齐：所有字段从同一列开始，无字段行不带尾随空格', () => {
    const lines = new TreeRenderer().render(makeDoc());
    const fieldColumn = (line: string): number => {
      const m = /(?:x=|cx=|\((?:\d))/g;
      const match = m.exec(line);
      return match ? match.index : -1;
    };
    const indices = lines
      .slice(1) // 跳过 `svg (WxH)` 根行
      .filter((l) => fieldColumn(l) >= 0)
      .map((l) => fieldColumn(l));
    expect(new Set(indices).size).toBe(1);
    expect(lines[3]).toBe('└── g#markers');
  });
});
