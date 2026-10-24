import { CommandHistory } from '../commands/CommandHistory';
import type { Command } from '../commands/Command';
import type { FileStore } from '../io/FileStore';
import type { SvgParser } from '../io/SvgParser';
import type { SvgSerializer } from '../io/SvgSerializer';
import { Document } from '../model/Document';
import { DomainError } from '../model/DomainError';
import { NumberFormat } from '../model/NumberFormat';
import type { ShapeProvider } from '../model/ShapeProvider';
import { ShapeRegistry } from '../model/ShapeRegistry';
import { BuiltinShapes } from '../shapes/BuiltinShapes';

/**
 * 业务门面：持有当前文档与命令历史，编排 io 与编辑命令。
 * 唯一装配点——注册内置图形 provider、解析/序列化、文件存储都由这里串起来。
 * 文档类命令（init/read/save/canvas 改尺寸）成功后截断并锁定历史（设计决策 3）。
 */
export class Editor {
  private readonly registry = new ShapeRegistry();
  private doc: Document | null = null;

  public constructor(
    private readonly fileStore: FileStore,
    private readonly parser: SvgParser,
    private readonly serializer: SvgSerializer,
    private readonly history: CommandHistory,
  ) {
    BuiltinShapes.register(this.registry);
  }

  // ===== 文档类 =====

  public init(width = 800, height = 600): string[] {
    const doc = new Document(width, height);
    this.doc = doc;
    this.history.truncateAndLock();
    return [`canvas ${this.dimensions(doc)} created`];
  }

  public read(path: string): string[] {
    const text = this.fileStore.readText(path);
    const { doc, warnings } = this.parser.parse(text, this.registry);
    doc.setFilePath(path);
    this.doc = doc;
    this.history.truncateAndLock();
    return [...warnings, `read ${path} (${doc.elementCount()} elements)`];
  }

  public save(path?: string): string[] {
    const doc = this.requireDocument();
    const target = path ?? doc.getFilePath();
    if (target === null) {
      throw new DomainError("no file path: use 'save <file.svg>'");
    }
    this.fileStore.writeText(target, this.serializer.serialize(doc));
    doc.setFilePath(target);
    this.history.truncateAndLock();
    return [`saved to ${target} (${doc.elementCount()} elements)`];
  }

  public canvas(width?: number, height?: number): string[] {
    const doc = this.requireDocument();
    if (width === undefined && height === undefined) {
      return [`canvas ${this.dimensions(doc)}`];
    }
    if (width === undefined || height === undefined) {
      throw new DomainError('canvas requires both width and height');
    }
    doc.setSize(width, height);
    this.history.truncateAndLock();
    return [`canvas resized to ${this.dimensions(doc)}`];
  }

  // ===== 编辑类（可撤销） =====

  public execute(cmd: Command): string[] {
    return this.history.execute(this.requireDocument(), cmd);
  }

  public undo(): string[] {
    return this.history.undo(this.requireDocument());
  }

  public redo(): string[] {
    return this.history.redo(this.requireDocument());
  }

  // ===== 查询 =====

  /** 按类型名取 provider；未注册时抛 unknown shape type（需求 4.2）。 */
  public providerFor(kind: string): ShapeProvider {
    return this.registry.get(kind);
  }

  /** 取当前文档；未 init/read 时抛固定文案（需求 4.2）。 */
  public requireDocument(): Document {
    if (!this.doc) {
      throw new DomainError("no document. use 'init' or 'read' first");
    }
    return this.doc;
  }

  private dimensions(doc: Document): string {
    return `${NumberFormat.format(doc.getWidth())}x${NumberFormat.format(doc.getHeight())}`;
  }
}
