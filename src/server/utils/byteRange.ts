/** R2 の get が返す範囲（offset・length・suffix のどれかが入る。値なしの項目が付いてくることもある） */
export type R2LikeRange = Readonly<{
  offset?: number | undefined
  length?: number | undefined
  suffix?: number | undefined
}>

/**
 * 返す範囲の先頭と末尾のバイト位置（両端を含む）。Content-Range に使う
 *
 * R2 は項目を値なし（undefined）で付けてくることがあるので、「項目があるか」ではなく
 * 「数値か」で判定する（`'suffix' in range` で判定して NaN を返し、動画が再生できなかったため）
 */
export const toByteRange = (range: R2LikeRange, size: number): { start: number; end: number } => {
  if (typeof range.suffix === 'number') {
    return { start: Math.max(size - range.suffix, 0), end: size - 1 }
  }
  const start = typeof range.offset === 'number' ? range.offset : 0
  const length = typeof range.length === 'number' ? range.length : size - start
  return { start, end: Math.min(start + length, size) - 1 }
}
