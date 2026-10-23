import { describe, it, expect } from 'vitest';
import { CommandHistory } from '../../src/commands/CommandHistory';
import { MoveCommand } from '../../src/commands/MoveCommand';
import { Document } from '../../src/model/Document';
import { Circle } from '../../src/shapes/Circle';

function makeDoc(): Document {
  const doc = new Document();
  doc.attach(new Circle('c1', 100, 100, 20), doc.getRoot());
  return doc;
}

describe('CommandHistory', () => {
  it('execute 入栈并返回回显；undo/redo 往返', () => {
    const doc = makeDoc();
    const h = new CommandHistory();
    expect(h.execute(doc, new MoveCommand('c1', 30, 0))).toEqual(['circle#c1 moved to (130,100)']);
    expect(h.undo(doc)).toEqual(['circle#c1 moved back to (100,100)']);
    expect(h.redo(doc)).toEqual(['circle#c1 moved to (130,100)']);
    expect(doc.find('c1').getAttr('cx')).toBe('130');
  });

  it('空栈：nothing to undo / nothing to redo', () => {
    const doc = makeDoc();
    const h = new CommandHistory();
    expect(() => h.undo(doc)).toThrow('nothing to undo');
    expect(() => h.redo(doc)).toThrow('nothing to redo');
  });

  it('truncateAndLock 后 undo/redo 均报固定文案；成功编辑后解锁', () => {
    const doc = makeDoc();
    const h = new CommandHistory();
    h.execute(doc, new MoveCommand('c1', 30, 0));
    h.truncateAndLock();
    expect(() => h.undo(doc)).toThrow('undo not allowed after io command');
    expect(() => h.redo(doc)).toThrow('undo not allowed after io command');
    // 成功编辑解锁，但历史已从存档点重新开始
    h.execute(doc, new MoveCommand('c1', 0, 10));
    expect(h.undo(doc)).toEqual(['circle#c1 moved back to (130,100)']);
    expect(() => h.undo(doc)).toThrow('nothing to undo');
  });

  it('undo 后新编辑清空 redo 栈', () => {
    const doc = makeDoc();
    const h = new CommandHistory();
    h.execute(doc, new MoveCommand('c1', 30, 0));
    h.undo(doc);
    h.execute(doc, new MoveCommand('c1', 0, 5));
    expect(() => h.redo(doc)).toThrow('nothing to redo');
  });

  it('执行失败的命令不入栈', () => {
    const doc = makeDoc();
    const h = new CommandHistory();
    h.execute(doc, new MoveCommand('c1', 30, 0));
    expect(() => h.execute(doc, new MoveCommand('nobody', 1, 1))).toThrow('no such shape: nobody');
    // 历史里仍只有第一条
    expect(h.undo(doc)).toEqual(['circle#c1 moved back to (100,100)']);
    expect(() => h.undo(doc)).toThrow('nothing to undo');
  });
});
