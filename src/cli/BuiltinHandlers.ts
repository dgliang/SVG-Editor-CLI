import type { CommandHandler } from './CommandHandler';
import { AddToHandler } from './handlers/AddToHandler';
import { BackHandler } from './handlers/BackHandler';
import { CanvasHandler } from './handlers/CanvasHandler';
import { CreateHandler } from './handlers/CreateHandler';
import { DeleteHandler } from './handlers/DeleteHandler';
import { FrontHandler } from './handlers/FrontHandler';
import { GroupHandler } from './handlers/GroupHandler';
import { HelpHandler } from './handlers/HelpHandler';
import { InitHandler } from './handlers/InitHandler';
import { MoveHandler } from './handlers/MoveHandler';
import { ReadHandler } from './handlers/ReadHandler';
import { RedoHandler } from './handlers/RedoHandler';
import { SaveHandler } from './handlers/SaveHandler';
import { ScaleHandler } from './handlers/ScaleHandler';
import { SetHandler } from './handlers/SetHandler';
import { ShowHandler } from './handlers/ShowHandler';
import { TreeHandler } from './handlers/TreeHandler';
import { UndoHandler } from './handlers/UndoHandler';
import { UngroupHandler } from './handlers/UngroupHandler';

/** 内置命令清单：19 个命令名 / 19 个 handler，供组合根与测试共用。 */
export function createBuiltinHandlers(): CommandHandler[] {
  return [
    new InitHandler(),
    new ReadHandler(),
    new SaveHandler(),
    new CanvasHandler(),
    new CreateHandler(),
    new DeleteHandler(),
    new MoveHandler(),
    new ScaleHandler(),
    new SetHandler(),
    new GroupHandler(),
    new UngroupHandler(),
    new AddToHandler(),
    new FrontHandler(),
    new BackHandler(),
    new TreeHandler(),
    new ShowHandler(),
    new UndoHandler(),
    new RedoHandler(),
    new HelpHandler(),
  ];
}
