/**
 * 序列化中间数据：Shape.toSvgNode() 的产物。
 * 由 SvgSerializer 消费，model 不关心具体字符串格式。
 */
export interface SvgNodeData {
  /** 标签名，如 'rect' / 'g' / 'text' */
  tag: string;
  /** 属性键值对，不包含 id 时不会自动补。空对象合法。 */
  attrs: Record<string, string>;
  /** text 元素的文本内容，其他标签忽略。 */
  text?: string;
  /** 子元素（仅 group/text 容器有；叶子图形为空数组）。 */
  children: SvgNodeData[];
}
