import { Editor } from '../../src/app/Editor';
import { createBuiltinHandlers } from '../../src/cli/BuiltinHandlers';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher';
import { Repl } from '../../src/cli/Repl';
import type { ReplIo } from '../../src/cli/Repl';
import { CommandHistory } from '../../src/commands/CommandHistory';
import type { FileStore } from '../../src/io/FileStore';
import { SvgParser } from '../../src/io/SvgParser';
import { SvgSerializer } from '../../src/io/SvgSerializer';
import { DomainError } from '../../src/model/DomainError';

/** 内存文件存储：测试不碰真实磁盘。 */
export class MemoryFileStore implements FileStore {
  public readonly files = new Map<string, string>();

  public readText(path: string): string {
    const text = this.files.get(path);
    if (text === undefined) throw new DomainError(`cannot read file: ${path}`);
    return text;
  }

  public writeText(path: string, text: string): void {
    this.files.set(path, text);
  }
}

/** 假终端：记录提示符与输出行，输入来自数组。 */
export class FakeIo implements ReplIo {
  public readonly output: string[] = [];
  public readonly prompts: string[] = [];

  public constructor(private readonly input: readonly string[]) {}

  public write(text: string): void {
    this.prompts.push(text);
  }

  public print(lines: readonly string[]): void {
    this.output.push(...lines);
  }

  public get lines(): AsyncIterable<string> {
    const input = this.input;
    return {
      [Symbol.asyncIterator]: async function* () {
        for (const line of input) yield line;
      },
    };
  }
}

export interface SessionResult {
  output: string[];
  store: MemoryFileStore;
}

/** 用真实 Editor/Dispatcher/Repl 跑一段输入，返回全部输出行。 */
export async function runSession(
  lines: readonly string[],
  files?: Record<string, string>,
): Promise<SessionResult> {
  const store = new MemoryFileStore();
  for (const [path, content] of Object.entries(files ?? {})) store.files.set(path, content);
  const editor = new Editor(store, new SvgParser(), new SvgSerializer(), new CommandHistory());
  const dispatcher = new CommandDispatcher(createBuiltinHandlers());
  const io = new FakeIo(lines);
  await new Repl(dispatcher, editor, io).run();
  return { output: io.output, store };
}
