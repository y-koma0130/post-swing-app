/**
 * 2本の動画を合わせて動かす計算。DOM に依存しない（ネイティブアプリでも使う）
 *
 * 2本の「ずれ」（offset）は、右の時刻 − 左の時刻。
 * それぞれを同じ瞬間（インパクトなど）で止めたときのずれを保ったまま、2本を一緒に再生・コマ送りする
 */

/** 一緒に再生しているとき、右がこれ以上ずれたら合わせ直す（秒）。小さすぎると、合わせ直しでかえってカクつく */
export const RESYNC_TOLERANCE_SEC = 0.06

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** 2本のずれ（右 − 左） */
export const offsetOf = (leftTimeSec: number, rightTimeSec: number): number =>
  rightTimeSec - leftTimeSec

/** 左の時刻に合わせた右の時刻。右の動画の先頭・末尾を越えるときは、そこで止める */
export const linkedTime = (
  leftTimeSec: number,
  offsetSec: number,
  rightDurationSec: number
): number => clamp(leftTimeSec + offsetSec, 0, Math.max(rightDurationSec, 0))

/** 一緒に再生しているとき、右を合わせ直すか（右が端で止まっているときは合わせ直さない） */
export const needsResync = (params: {
  leftTimeSec: number
  rightTimeSec: number
  offsetSec: number
  rightDurationSec: number
}): boolean => {
  const expected = linkedTime(params.leftTimeSec, params.offsetSec, params.rightDurationSec)
  return Math.abs(params.rightTimeSec - expected) > RESYNC_TOLERANCE_SEC
}

/**
 * 2本を一緒に動かしたあとの時刻（シークバー・コマ送り）。
 * 左を動かし、右はずれを保って付いていく。左が動けない端では、右も動かさない
 */
export const moveTogether = (params: {
  leftTimeSec: number
  nextLeftTimeSec: number
  offsetSec: number
  rightDurationSec: number
}): { left: number; right: number } => ({
  left: params.nextLeftTimeSec,
  right: linkedTime(params.nextLeftTimeSec, params.offsetSec, params.rightDurationSec),
})

/** 2本のずれの見せ方（「右が 0.12秒 先」）。0.01秒未満は「ずれ 0秒」 */
export const formatOffset = (offsetSec: number): string => {
  const rounded = Math.round(offsetSec * 100) / 100
  if (rounded === 0) return 'ずれ 0秒'
  return `右が ${Math.abs(rounded).toFixed(2)}秒 ${rounded > 0 ? '先' : '後'}`
}
