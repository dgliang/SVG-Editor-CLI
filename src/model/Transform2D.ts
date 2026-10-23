/**
 * 无旋转二维仿射变换：x' = sx*x + tx，y' = sy*y + ty。
 * 本期只支持 translate / scale（设计决策 4：rotate/matrix 不支持），
 * 因此仿射矩阵退化为这四个数，b=c=0 恒成立。
 */
export interface Transform2D {
  readonly sx: number;
  readonly sy: number;
  readonly tx: number;
  readonly ty: number;
}

export const IDENTITY_TRANSFORM: Transform2D = { sx: 1, sy: 1, tx: 0, ty: 0 };

/**
 * 组合变换：结果等价于先对点应用 inner、再应用 outer
 * （对应 SVG transform 列表的左乘语义）。
 */
export function combineTransforms(outer: Transform2D, inner: Transform2D): Transform2D {
  return {
    sx: outer.sx * inner.sx,
    sy: outer.sy * inner.sy,
    tx: outer.sx * inner.tx + outer.tx,
    ty: outer.sy * inner.ty + outer.ty,
  };
}
