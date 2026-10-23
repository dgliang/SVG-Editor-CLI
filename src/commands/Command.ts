import type { Document } from '../model/Document';

/** 命令执行/撤销的成功回显行（不含 error: 前缀）。 */
export interface CommandResult {
  lines: string[];
}

/**
 * 可撤销编辑命令。一条编辑命令 = 一个 undo 单元（设计决策 2）。
 * 实现约定：execute 必须先校验完再修改，失败不改变任何状态；
 * undo 需要的状态在执行时捕获到命令对象内（redo 即重新 execute）。
 */
export interface Command {
  execute(doc: Document): CommandResult;
  undo(doc: Document): CommandResult;
}
