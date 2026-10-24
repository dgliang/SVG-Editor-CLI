import * as readline from 'node:readline';
import { Editor } from './app/Editor';
import { createBuiltinHandlers } from './cli/BuiltinHandlers';
import { CommandDispatcher } from './cli/CommandDispatcher';
import { Repl } from './cli/Repl';
import type { ReplIo } from './cli/Repl';
import { CommandHistory } from './commands/CommandHistory';
import { NodeFileStore } from './io/NodeFileStore';
import { SvgParser } from './io/SvgParser';
import { SvgSerializer } from './io/SvgSerializer';

/**
 * 组合根：装配文件存储、编辑器、分派器与 REPL。
 * 只在这里出现具体实现的实例化；其他模块只认接口。
 */
const editor = new Editor(
  new NodeFileStore(),
  new SvgParser(),
  new SvgSerializer(),
  new CommandHistory(),
);
const dispatcher = new CommandDispatcher(createBuiltinHandlers());

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const io: ReplIo = {
  write: (text) => {
    process.stdout.write(text);
  },
  print: (lines) => {
    for (const line of lines) process.stdout.write(`${line}\n`);
  },
  lines: rl,
};

rl.on('SIGINT', () => {
  rl.close();
});

void new Repl(dispatcher, editor, io).run();
