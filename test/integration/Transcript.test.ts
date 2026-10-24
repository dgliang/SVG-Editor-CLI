import { describe, it, expect } from 'vitest';
import { runSession } from '../support/session';

const OTHER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported</text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
</svg>
`;

/** 需求文档 §6 的完整会话：逐字比对输出。 */
describe('transcript（需求 §6）', () => {
  it('完整会话输出与文档一致', async () => {
    const { output, store } = await runSession(
      [
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
        'save demo.svg',
        'undo',
        'read other.svg',
        'tree',
      ],
      { 'other.svg': OTHER_SVG },
    );

    expect(output).toEqual([
      "svg-editor 0.1 — type 'help' for commands",
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
      'saved to demo.svg (5 elements)',
      'error: undo not allowed after io command',
      'warning: assigned id rect1 to unnamed <rect>',
      'read other.svg (7 elements)',
      'svg (400x300)',
      '├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff',
      '├── text#t1        (10,290) "imported"',
      '├── circle#c1      cx=50 cy=50 r=10',
      '├── g#g1',
      '│   ├── rect#r2    x=0 y=0 w=10 h=10',
      '│   └── circle#c2  cx=5 cy=5 r=2',
      '└── ellipse#e1     cx=1 cy=2 rx=3 ry=4',
    ]);
    expect(store.files.get('demo.svg')).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"');
  });
});
