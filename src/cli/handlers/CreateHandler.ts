import type { Editor } from '../../app/Editor';
import { CreateCommand } from '../../commands/CreateCommand';
import { DomainError } from '../../model/DomainError';
import { NumberFormat } from '../../model/NumberFormat';
import { BaseHandler } from '../CommandHandler';
import type { Token } from '../Tokenizer';

const USAGE = 'create <type> <id> [params…] [in <containerId>]';

/**
 * create <type> <id> [params…] [in <containerId>]。
 * 参数个数与类型按 provider.params 校验；尾缀 `in` 子句只在未加引号时识别，
 * 因此 `create text t1 20 40 "in"` 的 "in" 是文本内容而不是子句。
 */
export class CreateHandler extends BaseHandler {
  public readonly names = ['create'];

  public run(args: readonly Token[], editor: Editor): string[] {
    this.requireCount(args, 2, Number.POSITIVE_INFINITY, USAGE);
    const type = this.text(args, 0, USAGE);
    const id = this.text(args, 1, USAGE);
    const provider = editor.providerFor(type); // 未注册类型在此抛错

    let rest = args.slice(2);
    let containerId: string | undefined;
    if (rest.length >= 2) {
      const clause = rest[rest.length - 2];
      const target = rest[rest.length - 1];
      if (clause && target && !clause.quoted && clause.value === 'in') {
        containerId = target.value;
        rest = rest.slice(0, rest.length - 2);
      }
    }

    const params = provider.params;
    const required = params.filter((p) => !p.optional).length;
    if (rest.length < required || rest.length > params.length) {
      throw new DomainError(`usage: ${USAGE}`);
    }

    const shapeArgs: Record<string, string> = {};
    params.forEach((spec, i) => {
      const token = rest[i];
      if (!token) return; // 可选项缺省：不写入 args，由 provider 取默认
      if (spec.type === 'number') {
        NumberFormat.parseStrict(token.value); // 严格数字校验，非法即抛 invalid number
      }
      shapeArgs[spec.name] = token.value;
    });

    return editor.execute(new CreateCommand(provider, id, shapeArgs, containerId));
  }
}
