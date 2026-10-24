import type { Editor } from '../app/Editor';
import { DomainError } from '../model/DomainError';
import type { CommandDispatcher } from './CommandDispatcher';
import { Tokenizer } from './Tokenizer';

/**
 * REPL 的输入输出边界（注入实现，便于测试不碰真实终端）。
 * lines 用 AsyncIterable：readline.Interface 直接满足，EOF 即迭代结束。
 */
export interface ReplIo {
  /** 写提示符（不换行）。 */
  write(text: string): void;
  /** 逐行输出结果。 */
  print(lines: readonly string[]): void;
  lines: AsyncIterable<string>;
}

const WELCOME = "svg-editor 0.1 — type 'help' for commands";
const PROMPT = 'svg> ';

/**
 * 逐行读入 → 分词 → 分发 → 输出。
 * `#` 开头（trimStart 后）为注释、空行忽略；DomainError 输出 `error:` 行，
 * 其他异常输出 `error: internal error: ...`（不打印堆栈）。
 */
export class Repl {
  private readonly tokenizer = new Tokenizer();

  public constructor(
    private readonly dispatcher: CommandDispatcher,
    private readonly editor: Editor,
    private readonly io: ReplIo,
  ) {}

  public async run(): Promise<void> {
    this.io.print([WELCOME]);
    const iterator = this.io.lines[Symbol.asyncIterator]();
    for (;;) {
      this.io.write(PROMPT);
      const next = await iterator.next();
      if (next.done) break;
      this.handle(next.value);
    }
  }

  /** 处理单行输入（注释/空行直接返回）。 */
  public handle(line: string): void {
    const trimmed = line.trimStart();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    const tokens = this.tokenizer.tokenize(trimmed);
    if (tokens.length === 0) return;
    try {
      const lines = this.dispatcher.dispatch(tokens, this.editor);
      if (lines.length > 0) this.io.print(lines);
    } catch (err) {
      if (err instanceof DomainError) {
        this.io.print([`error: ${err.message}`]);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        this.io.print([`error: internal error: ${message}`]);
      }
    }
  }
}
