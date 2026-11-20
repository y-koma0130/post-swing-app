import Link from 'next/link'
import type { ComponentProps } from 'react'
import { PRESSED_CLASS } from './pressStyles'

type Props = Omit<ComponentProps<typeof Link>, 'className'> & {
  /** 中身の並べ方（右端の「›」の左側） */
  className?: string | undefined
  /**
   * 詰めた形（余白を小さく、影なしの枠線だけ）。たくさん並ぶ一覧（レッスンの一覧など）で使う。
   * 単発のカードは、押しやすさを優先していつもの大きさにする
   */
  compact?: boolean | undefined
}

const base = `rounded-card border-line-soft hover:border-line hover:bg-surface ${PRESSED_CLASS} focus-visible:ring-mint flex items-center gap-3 border bg-white transition-colors focus-visible:ring-2 focus-visible:outline-none`

/**
 * 押すと別のページへ進むカード。
 * 枠のあるカードのうち、押せるものは必ずこれを使い、右端に「›」を出す（押せないカードと見分けられるように）。
 * 押した瞬間は背景を薄いミントにする（スマホでは hover が効かないため）
 */
export const CardLink = ({ className = '', compact = false, children, ...props }: Props) => (
  <Link className={`${base} ${compact ? 'px-4 py-3' : 'p-5 shadow-sm'}`} {...props}>
    <div className={`min-w-0 flex-1 ${className}`}>{children}</div>
    <span aria-hidden className="text-muted shrink-0 text-xl leading-none">
      ›
    </span>
  </Link>
)
