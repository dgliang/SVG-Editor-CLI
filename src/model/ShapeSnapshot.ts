/**
 * 图形快照：用于撤销/重做。由各 Shape 子类自行决定快照内容。
 * - 叶子：几何属性 + 样式属性的完整键值对
 * - Group：结构快照（父指针 + 子顺序 + 每个子孙的嵌套快照）
 *
 * 这是一个不透明类型，外部只传入 `Shape.restore`。
 */
export type ShapeSnapshot = unknown;
