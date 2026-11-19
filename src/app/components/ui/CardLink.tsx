import Link from 'next/link'
import type { ComponentProps } from 'react'

type Props = Omit<ComponentProps<typeof Link>, 'className'> & {
  /** 中身の並べ方（右端の「›」の左側） */
  className?: string | undefined
}

/**
 * 押すと別のページへ進むカード。
 * 枠のあるカードのうち、押せるものは必ずこれを使い、右端に「›」を出す（押せないカードと見分けられるように）。
 * 押した瞬間は背景を灰色にする（スマホでは hover が効かないため）
 */
export const CardLink = ({ className = '', children, ...props }: Props) => (
  <Link
    className="rounded-card border-line-soft hover:border-line hover:bg-surface active:bg-surface focus-visible:ring-mint flex items-center gap-3 border bg-white p-5 shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    {...props}
  >
    <div className={`min-w-0 flex-1 ${className}`}>{children}</div>
    <span aria-hidden className="text-muted shrink-0 text-xl leading-none">
      ›
    </span>
  </Link>
)
