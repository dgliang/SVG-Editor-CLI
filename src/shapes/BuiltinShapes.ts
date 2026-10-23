import { Group } from '../model/Group';
import type { ShapeRegistry } from '../model/ShapeRegistry';
import type { ShapeProvider } from '../model/ShapeProvider';
import { RectProvider } from './Rect';
import { CircleProvider } from './Circle';
import { EllipseProvider } from './Ellipse';
import { LineProvider } from './Line';
import { TextProvider } from './Text';

/** g 的 provider：无参数，只造空容器。 */
class GroupProvider implements ShapeProvider {
  public readonly kind = 'g';
  public readonly container = true;
  public readonly params: readonly [] = [];

  public create(id: string): Group {
    return new Group(id);
  }
}

/** 内核内置的六个图形类型。Editor 构造时调用 register 注入注册表。 */
export class BuiltinShapes {
  public static register(registry: ShapeRegistry): void {
    registry.register(new RectProvider());
    registry.register(new CircleProvider());
    registry.register(new EllipseProvider());
    registry.register(new LineProvider());
    registry.register(new TextProvider());
    registry.register(new GroupProvider());
  }
}
