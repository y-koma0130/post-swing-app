import { buttonClass } from './Button'

type Props = {
  /** 閉じているときの文言 */
  closedLabel?: string | undefined
  /** 開いているときの文言 */
  openLabel?: string | undefined
}

/**
 * 畳める区分（details）の summary の右端に置く「表示する ▾／閉じる ▴」。
 * 開け閉めの見た目を、どの画面でもこれにそろえる（details に group を付けて使う）
 */
export const DisclosureToggle = ({ closedLabel = '表示する', openLabel = '閉じる' }: Props) => (
  <span className={`${buttonClass({ variant: 'secondary', size: 'sm' })} shrink-0`}>
    <span className="group-open:hidden">{closedLabel}</span>
    <span className="hidden group-open:inline">{openLabel}</span>
    <span aria-hidden className="inline-block transition-transform group-open:rotate-180">
      ▾
    </span>
  </span>
)

/** summary に付けるクラス（行全体を押せるようにし、ブラウザの三角を消す） */
export const summaryClass =
  // 押した瞬間は背景を薄いミントにする（スマホでは hover が効かないため）
  'flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg transition-colors active:bg-mint-soft [&::-webkit-details-marker]:hidden'
