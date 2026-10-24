import { describe, it, expect } from 'vitest';
import { runSession as run } from '../support/session';

const WELCOME = "svg-editor 0.1 — type 'help' for commands";

describe('Repl', () => {
  it('启动横幅；空行与 # 注释被忽略', async () => {
    const { output } = await run(['', '   ', '# a comment', '  # indented comment']);
    expect(output).toEqual([WELCOME]);
  });

  it('需求典型会话：创建/分组/树/移动/撤销/重做/改文本/错误/删除', async () => {
    const { output } = await run([
      'init 800 600',
      'create rect bg 0 0 800 600 #ffffff',
      'create text title 20 40 "My Diagram"',
      'create circle c1 100 100 20 red',
      'create rect box 200 80 60 60 #3366ff',
      'group markers c1 box',
      'tree',
      'move c1 30 0',
      'undo',
      'redo',
      'set title text "My Diagram v2"',
      'undo',
      'group bad c1 markers',
      'delete box',
      'undo',
      'tree markers',
      'show c1',
    ]);

    expect(output).toEqual([
      WELCOME,
      'canvas 800x600 created',
      'rect#bg created',
      'text#title created',
      'circle#c1 created',
      'rect#box created',
      'g#markers created with 2 children',
      'svg (800x600)',
      '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title     (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
      'circle#c1 moved to (130,100)',
      'circle#c1 moved back to (100,100)',
      'circle#c1 moved to (130,100)',
      'text#title updated: text="My Diagram v2"',
      'text#title updated: text="My Diagram"',
      'error: cannot group a container into its own descendant: markers',
      'rect#box deleted',
      'rect#box restored into g#markers',
      'g#markers',
      '├── circle#c1  cx=130 cy=100 r=20 fill=red',
      '└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
      'circle#c1  parent=g#markers',
      '  cx=130 cy=100 r=20',
      '  fill=red',
    ]);
  });

  it('in 子句与带引号的 "in" 文本互不干扰', async () => {
    const { output } = await run([
      'init 400 200',
      'create g node1',
      'create text label 10 20 "in"',
      'create rect start 120 100 160 60 #4a90d9 in node1',
      'tree',
    ]);

    expect(output).toEqual([
      WELCOME,
      'canvas 400x200 created',
      'g#node1 created',
      'text#label created',
      'rect#start created in g#node1',
      'svg (400x200)',
      '├── g#node1',
      '│   └── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9',
      '└── text#label      (10,20) "in"',
    ]);
  });

  it('save 后 undo 被禁；canvas 只读不锁、改尺寸后锁', async () => {
    const { output, store } = await run([
      'init 400 300',
      'create rect r1 10 20 100 50 #eee',
      'save demo.svg',
      'undo',
      'canvas',
      'canvas 1000 500',
      'undo',
    ]);

    expect(output).toEqual([
      WELCOME,
      'canvas 400x300 created',
      'rect#r1 created',
      'saved to demo.svg (1 elements)',
      'error: undo not allowed after io command',
      'canvas 400x300',
      'canvas resized to 1000x500',
      'error: undo not allowed after io command',
    ]);
    expect(store.files.get('demo.svg')).toContain('<rect id="r1" x="10" y="20" width="100" height="50" fill="#eee"/>');
  });

  it('read：警告行 + 统计；随后 tree 与 show 反映读入内容', async () => {
    const { output } = await run(
      ['read other.svg', 'tree', 'show rect1'],
      {
        'other.svg': `<svg width="400" height="300"><rect x="0" y="0" width="400" height="300"/><circle id="c1" cx="50" cy="50" r="10"/></svg>`,
      },
    );

    expect(output).toEqual([
      WELCOME,
      'warning: assigned id rect1 to unnamed <rect>',
      'read other.svg (2 elements)',
      'svg (400x300)',
      '├── rect#rect1  x=0 y=0 w=400 h=300',
      '└── circle#c1   cx=50 cy=50 r=10',
      'rect#rect1  parent=svg',
      '  x=0 y=0 w=400 h=300',
    ]);
  });

  it('错误统一 error: 前缀，且命令失败不改变状态', async () => {
    const { output } = await run([
      'move c1 10 10',
      'init',
      'bogus',
      'move c1 abc 10',
      'move c1 10',
      'create hexagon h1 0 0',
      'create rect r1 0 0 10',
      'scale r1 -1',
      'show nobody',
      'tree',
    ]);

    expect(output).toEqual([
      WELCOME,
      "error: no document. use 'init' or 'read' first",
      'canvas 800x600 created',
      'error: unknown command: bogus',
      'error: invalid number: abc',
      'error: usage: move <id> <dx> <dy>',
      'error: unknown shape type: hexagon (is the plugin loaded?)',
      'error: usage: create <type> <id> [params…] [in <containerId>]',
      'error: scale factor must be positive',
      'error: no such shape: nobody',
      'svg (800x600)',
    ]);
  });

  it('help 输出命令清单与类型参数', async () => {
    const { output } = await run(['help']);
    expect(output[0]).toBe(WELCOME);
    expect(output[1]).toBe('commands:');
    expect(output.join('\n')).toContain('create <type> <id> [params…] [in <gid>]');
    expect(output.join('\n')).toContain('text <x> <y> "content"');
  });
});
