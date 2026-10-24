import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '../../src/app/Editor';
import { CommandHistory } from '../../src/commands/CommandHistory';
import { CreateCommand } from '../../src/commands/CreateCommand';
import { MoveCommand } from '../../src/commands/MoveCommand';
import { NodeFileStore } from '../../src/io/NodeFileStore';
import { SvgParser } from '../../src/io/SvgParser';
import { SvgSerializer } from '../../src/io/SvgSerializer';
import { MemoryFileStore } from '../support/session';

const OTHER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300"/>
  <circle id="c1" cx="50" cy="50" r="10"/>
</svg>
`;

describe('Editor', () => {
  let store: MemoryFileStore;
  let editor: Editor;

  beforeEach(() => {
    store = new MemoryFileStore();
    editor = new Editor(store, new SvgParser(), new SvgSerializer(), new CommandHistory());
  });

  it('未 init/read 时所有文档类命令报固定文案', () => {
    const msg = "no document. use 'init' or 'read' first";
    expect(() => editor.requireDocument()).toThrow(msg);
    expect(() => editor.save('a.svg')).toThrow(msg);
    expect(() => editor.canvas()).toThrow(msg);
    expect(() => editor.undo()).toThrow(msg);
  });

  it('init：回显尺寸、重置文档、锁定历史', () => {
    expect(editor.init(800, 600)).toEqual(['canvas 800x600 created']);
    expect(editor.requireDocument().getWidth()).toBe(800);
    expect(() => editor.undo()).toThrow('undo not allowed after io command');
  });

  it('canvas：无参数只显示不锁；带参数改尺寸并锁', () => {
    editor.init(800, 600);
    expect(editor.canvas()).toEqual(['canvas 800x600']);

    editor.execute(new CreateCommand(editor.providerFor('rect'), 'r1', { x: '0', y: '0', width: '1', height: '1' }));
    expect(editor.canvas()).toEqual(['canvas 800x600']);
    expect(editor.undo()).toEqual(['rect#r1 creation undone']);

    expect(editor.canvas(1000, 500)).toEqual(['canvas resized to 1000x500']);
    expect(editor.requireDocument().getHeight()).toBe(500);
    expect(() => editor.undo()).toThrow('undo not allowed after io command');
    expect(() => editor.canvas(1000)).toThrow('canvas requires both width and height');
  });

  it('read：警告在前、统计在后；记住 filePath；解析错误透传', () => {
    store.files.set('a.svg', OTHER_SVG);
    expect(editor.read('a.svg')).toEqual([
      'warning: assigned id rect1 to unnamed <rect>',
      'read a.svg (2 elements)',
    ]);
    expect(editor.requireDocument().getFilePath()).toBe('a.svg');
    expect(editor.requireDocument().find('rect1').getAttr('width')).toBe('400');

    expect(() => editor.read('missing.svg')).toThrow('cannot read file: missing.svg');
    store.files.set('bad.svg', '<html></html>');
    expect(() => editor.read('bad.svg')).toThrow('invalid SVG: root element is not <svg>');
  });

  it('save：无参数写回 read 的路径；带参数换路径；内容即序列化结果', () => {
    store.files.set('a.svg', OTHER_SVG);
    editor.read('a.svg');
    expect(editor.save()).toEqual(['saved to a.svg (2 elements)']);
    expect(store.files.get('a.svg')).toBe(new SvgSerializer().serialize(editor.requireDocument()));

    expect(editor.save('copy.svg')).toEqual(['saved to copy.svg (2 elements)']);
    expect(store.files.has('copy.svg')).toBe(true);
    expect(editor.requireDocument().getFilePath()).toBe('copy.svg');
  });

  it('save 无路径且从未 read/save 时报 no file path；save 锁定历史', () => {
    editor.init();
    expect(() => editor.save()).toThrow("no file path: use 'save <file.svg>'");

    editor.init();
    editor.execute(new CreateCommand(editor.providerFor('rect'), 'r1', { x: '0', y: '0', width: '1', height: '1' }));
    editor.save('out.svg');
    expect(() => editor.undo()).toThrow('undo not allowed after io command');
  });

  it('编辑命令经 execute 进历史：undo/redo 往返', () => {
    editor.init();
    editor.execute(new CreateCommand(editor.providerFor('circle'), 'c1', { cx: '100', cy: '100', r: '20', fill: 'red' }));
    expect(editor.execute(new MoveCommand('c1', 30, 0))).toEqual(['circle#c1 moved to (130,100)']);
    expect(editor.undo()).toEqual(['circle#c1 moved back to (100,100)']);
    expect(editor.redo()).toEqual(['circle#c1 moved to (130,100)']);
  });

  it('providerFor：已注册类型可用，未知类型报插件文案', () => {
    expect(editor.providerFor('rect').kind).toBe('rect');
    expect(() => editor.providerFor('hexagon')).toThrow('unknown shape type: hexagon (is the plugin loaded?)');
  });

  it('save 后再 read 回同一文件：结构保持一致（round-trip 经文件）', () => {
    editor.init(400, 300);
    editor.execute(new CreateCommand(editor.providerFor('rect'), 'r1', { x: '10', y: '20', width: '100', height: '50', fill: '#eee' }));
    editor.save('rt.svg');
    store.files.set('roundtrip.svg', store.files.get('rt.svg') ?? '');
    editor.read('roundtrip.svg');
    expect(editor.requireDocument().find('r1').getAttr('width')).toBe('100');
    expect(editor.requireDocument().getWidth()).toBe(400);
    // NodeFileStore 仅用于确认 fs 实现存在，本测试走内存实现
    expect(new NodeFileStore()).toBeInstanceOf(NodeFileStore);
  });
});
