import { describe, it, expect, beforeEach } from 'vitest';
import { AddToCommand } from '../../src/commands/AddToCommand';
import { CreateCommand } from '../../src/commands/CreateCommand';
import { DeleteCommand } from '../../src/commands/DeleteCommand';
import { GroupCommand } from '../../src/commands/GroupCommand';
import { MoveCommand } from '../../src/commands/MoveCommand';
import { ScaleCommand } from '../../src/commands/ScaleCommand';
import { SetCommand } from '../../src/commands/SetCommand';
import { UngroupCommand } from '../../src/commands/UngroupCommand';
import { ZOrderCommand } from '../../src/commands/ZOrderCommand';
import { Document } from '../../src/model/Document';
import { Group } from '../../src/model/Group';
import { ShapeRegistry } from '../../src/model/ShapeRegistry';
import { BuiltinShapes } from '../../src/shapes/BuiltinShapes';
import { Circle } from '../../src/shapes/Circle';
import { Rect } from '../../src/shapes/Rect';
import { Text } from '../../src/shapes/Text';

const registry = new ShapeRegistry();
BuiltinShapes.register(registry);
const rectProvider = registry.get('rect');
const gProvider = registry.get('g');

function childIds(doc: Document, id: string): string[] {
  const g = id === 'svg' ? doc.getRoot() : (doc.find(id) as Group);
  return g.readonlyChildren().map((c) => c.id);
}

describe('CreateCommand', () => {
  it('挂到根 / in 子句挂到容器；undo 移除；redo 重建', () => {
    const doc = new Document();
    const cmd = new CreateCommand(rectProvider, 'r1', { x: '10', y: '20', width: '100', height: '50', fill: '#eee' });
    expect(cmd.execute(doc).lines).toEqual(['rect#r1 created']);
    expect(doc.has('r1')).toBe(true);
    expect(cmd.undo(doc).lines).toEqual(['rect#r1 creation undone']);
    expect(doc.has('r1')).toBe(false);
    expect(cmd.execute(doc).lines).toEqual(['rect#r1 created']);
    expect(doc.has('r1')).toBe(true);
  });

  it('in 子句：回显带容器标签，父指针正确', () => {
    const doc = new Document();
    new CreateCommand(gProvider, 'node1', {}).execute(doc);
    const cmd = new CreateCommand(rectProvider, 'start', { x: '120', y: '100', width: '160', height: '60', fill: '#4a90d9' }, 'node1');
    expect(cmd.execute(doc).lines).toEqual(['rect#start created in g#node1']);
    expect(doc.find('start').parent).toBe(doc.find('node1'));
  });

  it('id 冲突 / 容器不存在 / 目标不是容器：失败不改状态', () => {
    const doc = new Document();
    new CreateCommand(rectProvider, 'r1', {}).execute(doc);
    const before = doc.elementCount();
    expect(() => new CreateCommand(rectProvider, 'r1', {}).execute(doc)).toThrow('id already exists: r1');
    expect(() => new CreateCommand(rectProvider, 'r2', {}, 'node9').execute(doc)).toThrow('no such container: node9');
    expect(() => new CreateCommand(rectProvider, 'r2', {}, 'r1').execute(doc)).toThrow('not a container: r1');
    expect(doc.elementCount()).toBe(before);
    expect(doc.has('r2')).toBe(false);
  });
});

describe('DeleteCommand', () => {
  it('删除叶子并按原父/原索引还原（回显带容器标签）', () => {
    const doc = new Document();
    const g = new Group('markers');
    doc.attach(g, doc.getRoot());
    doc.attach(new Circle('c1', 100, 100, 20, 'red'), g);
    doc.attach(new Rect('box', 200, 80, 60, 60, '#3366ff'), g);

    const cmd = new DeleteCommand('box');
    expect(cmd.execute(doc).lines).toEqual(['rect#box deleted']);
    expect(doc.has('box')).toBe(false);
    expect(cmd.undo(doc).lines).toEqual(['rect#box restored into g#markers']);
    expect(childIds(doc, 'markers')).toEqual(['c1', 'box']);
  });

  it('根级图形 undo 回显父级为 svg；删除容器连同子孙', () => {
    const doc = new Document();
    const g = new Group('g1');
    doc.attach(g, doc.getRoot());
    doc.attach(new Rect('r1', 0, 0, 1, 1), g);
    const cmd = new DeleteCommand('g1');
    cmd.execute(doc);
    expect(doc.elementCount()).toBe(0);
    expect(cmd.undo(doc).lines).toEqual(['g#g1 restored into svg']);
    expect(doc.has('r1')).toBe(true);
  });

  it('删除不存在 id 抛 no such shape', () => {
    expect(() => new DeleteCommand('r9').execute(new Document())).toThrow('no such shape: r9');
  });
});

describe('MoveCommand', () => {
  it('叶子：moved to 锚点；undo 取反；redo 回显与首次一致', () => {
    const doc = new Document();
    doc.attach(new Circle('c1', 100, 100, 20, 'red'), doc.getRoot());
    const cmd = new MoveCommand('c1', 30, 0);
    expect(cmd.execute(doc).lines).toEqual(['circle#c1 moved to (130,100)']);
    expect(cmd.undo(doc).lines).toEqual(['circle#c1 moved back to (100,100)']);
    expect(cmd.execute(doc).lines).toEqual(['circle#c1 moved to (130,100)']);
    expect(doc.find('c1').getAttr('cx')).toBe('130');
  });

  it('容器：moved by 增量，子孙整体平移', () => {
    const doc = new Document();
    const g = new Group('node2');
    doc.attach(g, doc.getRoot());
    doc.attach(new Rect('process', 520, 100, 160, 60), g);
    const cmd = new MoveCommand('node2', 0, 100);
    expect(cmd.execute(doc).lines).toEqual(['g#node2 moved by (0,100)']);
    expect(doc.find('process').getAttr('y')).toBe('200');
    expect(cmd.undo(doc).lines).toEqual(['g#node2 moved back by (0,-100)']);
    expect(doc.find('process').getAttr('y')).toBe('100');
  });
});

describe('ScaleCommand', () => {
  it('快照 undo：缩放 3 倍后精确还原，无浮点漂移', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 10, 20, 100, 50), doc.getRoot());
    const cmd = new ScaleCommand('r1', 3);
    expect(cmd.execute(doc).lines).toEqual(['rect#r1 scaled by 3']);
    expect(doc.find('r1').getAttr('width')).toBe('300');
    expect(cmd.undo(doc).lines).toEqual(['rect#r1 scaled back by 0.333333']);
    expect(doc.find('r1').getAttr('width')).toBe('100');
    expect(doc.find('r1').getAttr('x')).toBe('10');
  });

  it('非正 factor 抛 scale factor must be positive，不改状态', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 10, 20, 100, 50), doc.getRoot());
    expect(() => new ScaleCommand('r1', 0).execute(doc)).toThrow('scale factor must be positive');
    expect(() => new ScaleCommand('r1', -2).execute(doc)).toThrow('scale factor must be positive');
    expect(doc.find('r1').getAttr('width')).toBe('100');
  });
});

describe('SetCommand', () => {
  it('set text：回显新值，undo 回显并还原旧值', () => {
    const doc = new Document();
    doc.attach(new Text('title', 20, 40, 'My Diagram'), doc.getRoot());
    const cmd = new SetCommand('title', 'text', 'My Diagram v2');
    expect(cmd.execute(doc).lines).toEqual(['text#title updated: text="My Diagram v2"']);
    expect(cmd.undo(doc).lines).toEqual(['text#title updated: text="My Diagram"']);
    expect(doc.find('title').getAttr('text')).toBe('My Diagram');
  });

  it('旧值未设置的属性，undo 后恢复缺省（快照还原）', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 0, 0, 1, 1), doc.getRoot());
    const cmd = new SetCommand('r1', 'fill', 'red');
    cmd.execute(doc);
    expect(doc.find('r1').getAttr('fill')).toBe('red');
    cmd.undo(doc);
    expect(doc.find('r1').getAttr('fill')).toBeUndefined();
  });

  it('白名单外属性抛 unknown attribute，不改状态', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 0, 0, 1, 1), doc.getRoot());
    expect(() => new SetCommand('r1', 'opacity', '0.5').execute(doc)).toThrow('unknown attribute: opacity');
    expect(doc.find('r1').getAttr('opacity')).toBeUndefined();
  });
});

describe('GroupCommand', () => {
  it('收编同父成员：锚点为第一个成员摘除后的索引；undo 还原顺序', () => {
    const doc = new Document();
    doc.attach(new Rect('bg', 0, 0, 800, 600), doc.getRoot());
    doc.attach(new Text('title', 20, 40, 't'), doc.getRoot());
    doc.attach(new Circle('c1', 100, 100, 20), doc.getRoot());
    doc.attach(new Rect('box', 200, 80, 60, 60), doc.getRoot());

    const cmd = new GroupCommand('markers', ['c1', 'box']);
    expect(cmd.execute(doc).lines).toEqual(['g#markers created with 2 children']);
    expect(childIds(doc, 'svg')).toEqual(['bg', 'title', 'markers']);
    expect(childIds(doc, 'markers')).toEqual(['c1', 'box']);

    expect(cmd.undo(doc).lines).toEqual(['g#markers grouping undone']);
    expect(childIds(doc, 'svg')).toEqual(['bg', 'title', 'c1', 'box']);
    expect(doc.has('markers')).toBe(false);
    // redo：同一命令对象重新执行
    expect(cmd.execute(doc).lines).toEqual(['g#markers created with 2 children']);
    expect(childIds(doc, 'markers')).toEqual(['c1', 'box']);
  });

  it('跨父收编：锚定在第一个成员的父容器', () => {
    const doc = new Document();
    doc.attach(new Rect('a', 0, 0, 1, 1), doc.getRoot());
    doc.attach(new Rect('b', 0, 0, 1, 1), doc.getRoot());
    const g1 = new Group('g1');
    doc.attach(g1, doc.getRoot());
    doc.attach(new Circle('c', 0, 0, 1), g1);

    new GroupCommand('g2', ['b', 'c']).execute(doc);
    expect(childIds(doc, 'svg')).toEqual(['a', 'g2', 'g1']);
    expect(childIds(doc, 'g2')).toEqual(['b', 'c']);
  });

  it('成员含祖先关系抛错（transcript 场景），不改状态', () => {
    const doc = new Document();
    const markers = new Group('markers');
    doc.attach(markers, doc.getRoot());
    doc.attach(new Circle('c1', 100, 100, 20), markers);
    const before = doc.elementCount();
    expect(() => new GroupCommand('bad', ['c1', 'markers']).execute(doc))
      .toThrow('cannot group a container into its own descendant: markers');
    expect(doc.elementCount()).toBe(before);
    expect(doc.has('bad')).toBe(false);
    expect(doc.find('c1').parent).toBe(markers);
  });

  it('成员重复 / 新 id 已存在 / 成员不存在', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 0, 0, 1, 1), doc.getRoot());
    expect(() => new GroupCommand('g1', ['r1', 'r1']).execute(doc)).toThrow('duplicate member: r1');
    expect(() => new GroupCommand('r1', ['r1']).execute(doc)).toThrow('id already exists: r1');
    expect(() => new GroupCommand('g1', ['r1', 'r9']).execute(doc)).toThrow('no such shape: r9');
  });
});

describe('UngroupCommand', () => {
  it('子节点提升到原容器位置；undo 重组', () => {
    const doc = new Document();
    const outer = new Group('outer');
    doc.attach(outer, doc.getRoot());
    doc.attach(new Rect('lead', 0, 0, 1, 1), outer);
    const inner = new Group('inner');
    doc.attach(inner, outer);
    doc.attach(new Rect('r1', 0, 0, 1, 1), inner);
    doc.attach(new Rect('r2', 0, 0, 2, 2), inner);

    const cmd = new UngroupCommand('inner');
    expect(cmd.execute(doc).lines).toEqual(['g#inner ungrouped (2 children)']);
    expect(childIds(doc, 'outer')).toEqual(['lead', 'r1', 'r2']);
    expect(doc.has('inner')).toBe(false);

    expect(cmd.undo(doc).lines).toEqual(['g#inner regrouped (2 children)']);
    expect(childIds(doc, 'outer')).toEqual(['lead', 'inner']);
    expect(childIds(doc, 'inner')).toEqual(['r1', 'r2']);
  });

  it('ungroup 叶子 / 顶层容器抛错', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 0, 0, 1, 1), doc.getRoot());
    doc.attach(new Group('scene'), doc.getRoot());
    expect(() => new UngroupCommand('r1').execute(doc)).toThrow('cannot ungroup composite shape: r1');
    expect(() => new UngroupCommand('scene').execute(doc)).toThrow('cannot ungroup top-level container: scene');
  });
});

describe('AddToCommand', () => {
  it('移入容器末尾；undo 回到原父原索引', () => {
    const doc = new Document();
    doc.attach(new Rect('r1', 0, 0, 1, 1), doc.getRoot());
    doc.attach(new Rect('r2', 0, 0, 2, 2), doc.getRoot());
    doc.attach(new Group('g1'), doc.getRoot());

    const cmd = new AddToCommand('g1', 'r1');
    expect(cmd.execute(doc).lines).toEqual(['rect#r1 moved into g#g1']);
    expect(childIds(doc, 'g1')).toEqual(['r1']);
    expect(childIds(doc, 'svg')).toEqual(['r2', 'g1']);

    expect(cmd.undo(doc).lines).toEqual(['rect#r1 moved back into svg']);
    expect(childIds(doc, 'svg')).toEqual(['r1', 'r2', 'g1']);
  });

  it('目标非容器 / 移进自己 / 移进子孙', () => {
    const doc = new Document();
    const g1 = new Group('g1');
    doc.attach(g1, doc.getRoot());
    doc.attach(new Group('g2'), g1);
    doc.attach(new Rect('r1', 0, 0, 1, 1), doc.getRoot());

    expect(() => new AddToCommand('r1', 'r1').execute(doc)).toThrow('not a container: r1');
    expect(() => new AddToCommand('g1', 'g1').execute(doc)).toThrow('cannot addto a shape into itself: g1');
    expect(() => new AddToCommand('g2', 'g1').execute(doc))
      .toThrow('cannot addto a container into its own descendant: g1');
    expect(doc.find('g1').parent).toBe(doc.getRoot());
  });
});

describe('ZOrderCommand', () => {
  it('front/back 调整同父顺序；undo 恢复原索引', () => {
    const doc = new Document();
    doc.attach(new Rect('a', 0, 0, 1, 1), doc.getRoot());
    doc.attach(new Rect('b', 0, 0, 1, 1), doc.getRoot());
    doc.attach(new Rect('c', 0, 0, 1, 1), doc.getRoot());

    const front = new ZOrderCommand('a', 'front');
    expect(front.execute(doc).lines).toEqual(['rect#a moved to front']);
    expect(childIds(doc, 'svg')).toEqual(['b', 'c', 'a']);
    expect(front.undo(doc).lines).toEqual(['rect#a z-order restored']);
    expect(childIds(doc, 'svg')).toEqual(['a', 'b', 'c']);

    const back = new ZOrderCommand('c', 'back');
    expect(back.execute(doc).lines).toEqual(['rect#c moved to back']);
    expect(childIds(doc, 'svg')).toEqual(['c', 'a', 'b']);
  });
});
