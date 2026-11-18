/**
 * 画像の真ん中を正方形に切り抜く範囲（プロフィール画像。DOM に依存しない）
 */
export const calcSquareCrop = (
  width: number,
  height: number
): Readonly<{ sx: number; sy: number; size: number }> => {
  const size = Math.min(width, height)
  return { sx: Math.round((width - size) / 2), sy: Math.round((height - size) / 2), size }
}
