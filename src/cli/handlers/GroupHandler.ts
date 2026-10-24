import type { Editor } from '../../app/Editor';
import { GroupCommand } from '../../commands/GroupCommand';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'group <newGid> <id1> <id2>…';

/** group <newGid> <id1> <id2>…：新建容器并收编已存在图形（一个 undo 单元）。 */
export class GroupHandler extends BaseHandler {
  public readonly names = ['group'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 2, Number.POSITIVE_INFINITY, USAGE);
    const newId = this.text(args, 0, USAGE);
    const memberIds = args.slice(1).map((t) => t.value);
    return editor.execute(new GroupCommand(newId, memberIds));
  }
}
