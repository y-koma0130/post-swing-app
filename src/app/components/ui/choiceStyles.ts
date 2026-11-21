/**
 * 選ぶ・切り替えるボタンの見た目（画面ごとに作らず、ここの2つだけを使う）
 *
 * - segment：枠の中で1つを選ぶ切り替え（線の道具・再生速度・提出のタブ・ガイドの正面／後方）。
 *   外側を segmentGroupClass で囲む
 * - chip：1つずつ並んだ選択肢（動画の角度・提出の中の動画）
 */
const focusRing = 'focus-visible:ring-mint focus-visible:ring-2 focus-visible:outline-none'

export const segmentGroupClass =
  'border-line inline-flex flex-wrap rounded-full border bg-white p-0.5'

export const segmentClass = (active: boolean): string =>
  [
    'rounded-full px-3 py-1 text-sm font-bold transition-colors disabled:opacity-40',
    focusRing,
    active ? 'bg-mint-soft text-ink' : 'text-muted hover:text-ink',
  ].join(' ')

export const chipClass = (active: boolean): string =>
  [
    'rounded-full border px-3 py-1 text-sm transition-colors',
    focusRing,
    active
      ? 'border-mint bg-mint-soft text-ink font-bold'
      : 'border-line text-muted hover:text-ink bg-white',
  ].join(' ')

/** × などの記号だけのボタン（閉じる・外す） */
export const iconButtonClass = [
  'text-muted hover:text-ink active:text-ink rounded-full px-2 leading-none transition-colors',
  focusRing,
].join(' ')
