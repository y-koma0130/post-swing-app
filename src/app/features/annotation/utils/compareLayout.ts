/**
 * 2本並べた画像（比較のキャプチャ）の並べ方。DOM に依存しない（ネイティブアプリでも使う）
 *
 * - 2本とも縦長なら左右に並べ、高さをそろえる
 * - どちらかが横長なら上下に並べ、幅をそろえる
 * - 画像の長い辺は MAX_COMPARE_EDGE まで（生徒がスマホで見るには十分で、送る量を抑える）
 */

export const MAX_COMPARE_EDGE = 1600
/** 2本のあいだのすき間（ピクセル） */
export const COMPARE_GAP = 12

type Size = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }

export type CompareLayout = {
  width: number
  height: number
  left: Rect
  right: Rect
}

export const compareLayout = (left: Size, right: Size): CompareLayout => {
  const sideBySide = left.height >= left.width && right.height >= right.width
  if (sideBySide) {
    // 高さを1にそろえたときの幅
    const lw = left.width / left.height
    const rw = right.width / right.height
    const height = Math.floor(
      Math.min(
        MAX_COMPARE_EDGE,
        (MAX_COMPARE_EDGE - COMPARE_GAP) / (lw + rw),
        left.height,
        right.height
      )
    )
    const leftWidth = Math.floor(lw * height)
    const rightWidth = Math.floor(rw * height)
    return {
      width: leftWidth + COMPARE_GAP + rightWidth,
      height,
      left: { x: 0, y: 0, width: leftWidth, height },
      right: { x: leftWidth + COMPARE_GAP, y: 0, width: rightWidth, height },
    }
  }
  const lh = left.height / left.width
  const rh = right.height / right.width
  const width = Math.floor(
    Math.min(
      MAX_COMPARE_EDGE,
      (MAX_COMPARE_EDGE - COMPARE_GAP) / (lh + rh),
      left.width,
      right.width
    )
  )
  const leftHeight = Math.floor(lh * width)
  const rightHeight = Math.floor(rh * width)
  return {
    width,
    height: leftHeight + COMPARE_GAP + rightHeight,
    left: { x: 0, y: 0, width, height: leftHeight },
    right: { x: 0, y: leftHeight + COMPARE_GAP, width, height: rightHeight },
  }
}
