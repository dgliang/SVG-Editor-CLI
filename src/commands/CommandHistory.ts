import { DomainError } from '../model/DomainError';
import type { Document } from '../model/Document';
import type { Command } from './Command';

/**
 * 撤销/重做历史。规则（需求 4.3、设计决策 3）：
 * - 一条编辑命令一个 undo 单元；成功执行才入栈，入栈即清空 redo
 * - io 命令（init/read/save/canvas 改尺寸）后 truncateAndLock：双栈清空并锁定，
 *   锁定期间 undo/redo 均报 'undo not allowed after io command'（需求固定文案）
 * - 下一条成功的编辑命令解除锁定（历史从存档点重新开始）
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private ioLocked = false;

  /** 执行并入栈；返回成功回显行。执行失败则不入栈、不影响既有历史。 */
  public execute(doc: Document, cmd: Command): string[] {
    const result = cmd.execute(doc);
    this.undoStack.push(cmd);
    this.redoStack = [];
    this.ioLocked = false;
    return result.lines;
  }

  public undo(doc: Document): string[] {
    if (this.ioLocked) throw new DomainError('undo not allowed after io command');
    const cmd = this.undoStack.pop();
    if (!cmd) throw new DomainError('nothing to undo');
    const result = cmd.undo(doc);
    this.redoStack.push(cmd);
    return result.lines;
  }

  public redo(doc: Document): string[] {
    if (this.ioLocked) throw new DomainError('undo not allowed after io command');
    const cmd = this.redoStack.pop();
    if (!cmd) throw new DomainError('nothing to redo');
    const result = cmd.execute(doc);
    this.undoStack.push(cmd);
    return result.lines;
  }

  /** io 命令调用：清空双栈并锁定，直到下一条成功的编辑命令。 */
  public truncateAndLock(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.ioLocked = true;
  }
}
