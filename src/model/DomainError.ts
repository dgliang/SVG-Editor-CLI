/**
 * 业务错误。message 即输出中 `error: ` 之后的部分，
 * 例如 `new DomainError('no such shape: r9')`。
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
