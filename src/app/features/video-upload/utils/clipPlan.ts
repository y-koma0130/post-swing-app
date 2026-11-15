/**
 * 送る前の動画の切り出しと変換の決め方（ブラウザでもネイティブアプリでも使えるよう、DOM に依存しない）
 *
 * - スイングは数秒なので、送るのは前後を含めて最大20秒まで
 * - 長辺は 1920px まで縮める（4K は添削に要らず、容量と変換時間だけが増える）
 * - フレームレートは元のまま（スロー撮影の 120・240fps はコマ送りで効く）
 */
export const CLIP_RULES = {
  maxSeconds: 20,
  /** 短すぎる範囲は送れない（スイングが入らない） */
  minSeconds: 0.5,
  maxLongSide: 1920,
  /** 送信の上限（100MB）に対して、変換後の大きさをこの割合までに収める */
  sizeBudgetRatio: 0.85,
  /** これより低いビットレートにはしない（画質が崩れて添削に使えない） */
  minBitrate: 2_000_000,
} as const

export type ClipRange = Readonly<{ start: number; end: number }>

/** 最初に選ばれている範囲。長い動画は先頭から20秒 */
export const defaultClipRange = (duration: number): ClipRange => ({
  start: 0,
  end: Math.min(duration, CLIP_RULES.maxSeconds),
})

/**
 * 範囲を動画の長さと上限に収める。動かした側（start か end）を優先し、もう片方を寄せる
 */
export const adjustClipRange = (
  range: ClipRange,
  duration: number,
  moved: 'start' | 'end'
): ClipRange => {
  const minLength = Math.min(CLIP_RULES.minSeconds, duration)
  const clamp = (value: number) => Math.min(Math.max(value, 0), duration)

  if (moved === 'start') {
    const start = Math.min(clamp(range.start), duration - minLength)
    const end = Math.min(
      Math.max(clamp(range.end), start + minLength),
      start + CLIP_RULES.maxSeconds
    )
    return { start, end }
  }
  const end = Math.max(clamp(range.end), minLength)
  const start = Math.max(Math.min(clamp(range.start), end - minLength), end - CLIP_RULES.maxSeconds)
  return { start, end }
}

/** H.264 は幅・高さが偶数でないと符号化できない */
const even = (value: number): number => Math.max(2, Math.round(value / 2) * 2)

/** 変換後の大きさ。長辺を上限に収め、縦横比は保つ */
export const planOutputSize = (
  width: number,
  height: number
): Readonly<{ width: number; height: number }> => {
  const scale = Math.min(1, CLIP_RULES.maxLongSide / Math.max(width, height))
  return { width: even(width * scale), height: even(height * scale) }
}

/**
 * 変換のビットレート（bps）
 *
 * 1画素・1コマあたりのビット数で決める。フレームレートが高いほどコマ間の差が小さく、
 * 1コマに要るビットは減るので、30fps を基準に平方根で下げる。
 * 送信の上限を超えないよう、長さから決まる上限で抑える
 */
export const planBitrate = ({
  width,
  height,
  frameRate,
  seconds,
  maxBytes,
}: Readonly<{
  width: number
  height: number
  frameRate: number
  seconds: number
  maxBytes: number
}>): number => {
  const fps = frameRate > 0 ? frameRate : 30
  const bitsPerPixelPerFrame = 0.1 * Math.sqrt(30 / Math.max(fps, 30))
  const wanted = width * height * fps * bitsPerPixelPerFrame
  const budget = (maxBytes * 8 * CLIP_RULES.sizeBudgetRatio) / Math.max(seconds, 1)
  return Math.round(Math.max(CLIP_RULES.minBitrate, Math.min(wanted, budget)))
}
