import type { ShapeProvider } from './ShapeProvider';
import { DomainError } from './DomainError';

export class ShapeRegistry {
  private readonly providers = new Map<string, ShapeProvider>();

  register(provider: ShapeProvider): void {
    if (this.providers.has(provider.kind)) {
      throw new Error(`duplicate shape provider kind: ${provider.kind}`);
    }
    this.providers.set(provider.kind, provider);
  }

  /**
   * 按 kind 查找 provider。不存在时抛 DomainError，
   * 文案含 "unknown shape type: x (is the plugin loaded?)" 以匹配需求 4.2。
   */
  get(kind: string): ShapeProvider {
    const provider = this.providers.get(kind);
    if (!provider) {
      throw new DomainError(`unknown shape type: ${kind} (is the plugin loaded?)`);
    }
    return provider;
  }

  /** 已注册的所有 kind，按注册顺序。 */
  kinds(): string[] {
    return Array.from(this.providers.keys());
  }

  /** 用于测试：是否注册过某 kind。 */
  has(kind: string): boolean {
    return this.providers.has(kind);
  }
}
