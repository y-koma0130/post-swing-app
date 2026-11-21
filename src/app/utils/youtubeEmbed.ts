/**
 * YouTube の埋め込みプレーヤーの URL
 * - youtube-nocookie.com：見るまで Google の Cookie を付けない
 * - rel=0：終わったあとのおすすめを、同じチャンネルの動画にする
 * - playsinline=1：iPhone で全画面にせず、その場で再生する
 */
export const youtubeEmbedUrl = (youtubeId: string, startSec: number): string => {
  const params = new URLSearchParams({ rel: '0', playsinline: '1' })
  if (startSec > 0) params.set('start', String(startSec))
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${params}`
}

/** 開始位置の表示（90 → 「1:30」） */
export const formatStartSec = (startSec: number): string => {
  const h = Math.floor(startSec / 3600)
  const m = Math.floor((startSec % 3600) / 60)
  const s = String(startSec % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
