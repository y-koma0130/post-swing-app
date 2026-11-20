/**
 * 文字だけのリンクの見た目。押した瞬間・キーボードで選んだときの反応をそろえる
 * （スマホでは hover が効かないので、押した瞬間に必ず見た目が変わるようにする）
 */

const focusRing = 'focus-visible:ring-mint focus-visible:ring-2 focus-visible:outline-none'

/**
 * 戻り先や、ヘッダーのメニューのような小さなリンク。
 * 押せる範囲を文字より少し広げ、押した瞬間は背景を薄いミントにする（余白の分だけ左に寄せて、文字の位置は変えない）
 */
export const navLinkClass = [
  'text-muted -mx-2 inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors',
  'hover:bg-surface hover:text-ink active:bg-mint-soft active:text-ink',
  focusRing,
].join(' ')

/** 下線を付けない、押せる文字（色付き・太字で押せると分かるもの）。色はそのまま、押した瞬間に背景を薄いミントにする */
export const plainLinkClass = [
  'rounded-sm transition-colors hover:opacity-70 active:bg-mint-soft',
  focusRing,
].join(' ')

/** 文の中のリンク（規約・設定へ、など）。色はまわりの文字のまま、下線を付け、押した瞬間に背景を薄いミントにする */
export const inlineLinkClass = `underline underline-offset-2 ${plainLinkClass}`

/** 下線のない、文字だけのリンク（フッターなど）。押した瞬間に濃くし、背景を薄いミントにする */
export const quietLinkClass = [
  'rounded-sm transition-colors underline-offset-2',
  'hover:text-ink hover:underline active:bg-mint-soft active:text-ink',
  focusRing,
].join(' ')
