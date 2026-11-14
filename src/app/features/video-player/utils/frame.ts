/**
 * コマ送りと再生速度の計算。DOM に依存しない（ネイティブアプリでも使う）
 */

export const PLAYBACK_RATES = [0.25, 0.5, 1] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

/** フレームレートが分かるまでの仮の値。iPhone の標準設定（30fps）に合わせる */
export const DEFAULT_FRAME_DURATION_SEC = 1 / 30

/** 推定値をこの中のどれかに寄せる（計測の誤差で 59.7fps などになるため） */
const COMMON_FPS = [24, 25, 30, 50, 60, 120, 240] as const
const SNAP_TOLERANCE = 0.05
const MIN_DELTAS_FOR_ESTIMATE = 5

/** 浮動小数の誤差で、フレームの先頭ちょうどが1つ前のフレームと判定されないようにする */
const EPSILON = 1e-6

export type FrameSample = {
  /** 表示されたフレームの時刻（秒） */
  mediaTime: number
  /** それまでに表示されたフレームの数 */
  presentedFrames: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export type ToFrameIndex = (timeSec: number, frameDurationSec: number) => number
export const toFrameIndex: ToFrameIndex = (timeSec, frameDurationSec) =>
  Math.floor(timeSec / frameDurationSec + EPSILON)

/**
 * フレームの中央の時刻。境界ちょうどに seek すると、ブラウザによって前後どちらのフレームが出るかが変わるため
 */
export type FrameCenterTime = (frameIndex: number, frameDurationSec: number) => number
export const frameCenterTime: FrameCenterTime = (frameIndex, frameDurationSec) =>
  (frameIndex + 0.5) * frameDurationSec

export type StepFrameTime = (params: {
  currentTimeSec: number
  frames: number
  frameDurationSec: number
  durationSec: number
}) => number

/** 今の位置から frames コマ進めた（負なら戻した）時刻。動画の先頭と末尾で止まる */
export const stepFrameTime: StepFrameTime = ({
  currentTimeSec,
  frames,
  frameDurationSec,
  durationSec,
}) => {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return currentTimeSec
  }
  const lastIndex = Math.max(Math.ceil(durationSec / frameDurationSec - EPSILON) - 1, 0)
  const index = clamp(toFrameIndex(currentTimeSec, frameDurationSec) + frames, 0, lastIndex)
  return frameCenterTime(index, frameDurationSec)
}

export type EstimateFrameDuration = (samples: readonly FrameSample[]) => number | null

/**
 * 再生中に表示されたフレームの記録から、1コマの長さ（秒）を推定する
 *
 * ブラウザは動画のフレームレートを教えてくれないため、表示されたフレームの時刻の差から求める。
 * フレームが落ちると差は大きくなる（小さくはならない）ので、中央値ではなく小さい側の値を使う
 */
export const estimateFrameDuration: EstimateFrameDuration = (samples) => {
  const deltas: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const curr = samples[i]
    if (!prev || !curr) continue
    const frames = curr.presentedFrames - prev.presentedFrames
    const time = curr.mediaTime - prev.mediaTime
    if (frames > 0 && time > 0) {
      deltas.push(time / frames)
    }
  }
  if (deltas.length < MIN_DELTAS_FOR_ESTIMATE) {
    return null
  }

  const sorted = deltas.toSorted((a, b) => a - b)
  const low = sorted[Math.floor(sorted.length * 0.2)]
  if (low === undefined) {
    return null
  }

  const fps = 1 / low
  const snapped = COMMON_FPS.find((common) => Math.abs(fps - common) / common <= SNAP_TOLERANCE)
  return snapped === undefined ? low : 1 / snapped
}

export type FormatTimecode = (timeSec: number) => string

/** 0:01.42 の形（分:秒.1/100秒） */
export const formatTimecode: FormatTimecode = (timeSec) => {
  const safe = Number.isFinite(timeSec) && timeSec > 0 ? timeSec : 0
  const minutes = Math.floor(safe / 60)
  const seconds = safe - minutes * 60
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
}

export type FormatFps = (frameDurationSec: number) => string
export const formatFps: FormatFps = (frameDurationSec) => `${Math.round(1 / frameDurationSec)}fps`
