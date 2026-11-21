/**
 * YouTube の埋め込みプレーヤーの URL
 * - youtube-nocookie.com：見るまで Google の Cookie を付けない
 * - rel=0：終わったあとのおすすめを、同じチャンネルの動画にする
 * - playsinline=1：iPhone で全画面にせず、その場で再生する
 * - autoplay=1：サムネイルを押してから読み込むので、読み込んだらすぐ再生する
 */
export const youtubeEmbedUrl = (
  youtubeId: string,
  startSec: number,
  options: Readonly<{ autoplay?: boolean }> = {}
): string => {
  const params = new URLSearchParams({ rel: '0', playsinline: '1' })
  if (startSec > 0) params.set('start', String(startSec))
  if (options.autoplay) params.set('autoplay', '1')
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${params}`
}

/**
 * 再生する前に見せるサムネイル（YouTube が動画ごとに用意している画像）
 * - hq720：16:9 で上下に黒い帯がない（縦の枠で中央を切り出しても黒くならない）。古い動画にはないことがある
 * - hqdefault：どの動画にもあるが、4:3 で上下に黒い帯が入る
 */
export const youtubeThumbnailUrl = (youtubeId: string, size: 'hq720' | 'hqdefault'): string =>
  `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/${size}.jpg`

/** 開始位置の表示（90 → 「1:30」） */
export const formatStartSec = (startSec: number): string => {
  const h = Math.floor(startSec / 3600)
  const m = Math.floor((startSec % 3600) / 60)
  const s = String(startSec % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
