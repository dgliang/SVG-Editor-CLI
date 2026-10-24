import type { Editor } from '../../app/Editor';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const HELP_LINES = [
  'commands:',
  '  init [w] [h]                             new canvas (default 800x600)',
  '  read <file.svg>                          read an SVG file',
  '  save [file.svg]                          save document (default: last path)',
  '  canvas [w] [h]                           show or resize canvas',
  '  create <type> <id> [params…] [in <gid>]  create a shape',
  '  delete <id>                              delete shape (container: whole subtree)',
  '  move <id> <dx> <dy>                      translate',
  '  scale <id> <factor>                      scale about origin, factor > 0',
  '  set <id> <attr> <value>                  set attribute',
  '  group <newGid> <id1> <id2>…              group existing shapes',
  '  ungroup <gid>                            ungroup container',
  '  addto <gid> <id>                         move shape into container',
  '  front <id> / back <id>                   reorder within parent',
  '  tree [id]                                print structure tree',
  '  show <id>                                print shape details',
  '  undo / redo                              undo / redo last edit',
  '  help                                     this list',
  'types:',
  '  rect <x> <y> <w> <h> [fill]',
  '  circle <cx> <cy> <r> [fill]',
  '  ellipse <cx> <cy> <rx> <ry> [fill]',
  '  line <x1> <y1> <x2> <y2> [stroke]',
  '  text <x> <y> "content"',
  '  g',
];

/** help：列出全部命令与语法。 */
export class HelpHandler extends BaseHandler {
  public readonly names = ['help'];

  public run(args: readonly Token[], _editor: Editor): string[] {
    this.requireCount(args, 0, 0, 'help');
    return [...HELP_LINES];
  }
}
