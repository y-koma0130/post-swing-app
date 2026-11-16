import type { ReactNode } from 'react'

/**
 * 小さな札（状態・残り枠など）。色の意味は4つだけ
 * - mint：うれしい・進んでいる（受付中・添削待ち）
 * - neutral：ふつう（終了・生徒の番）
 * - warning：注意（不在中）
 * - danger：止まっている（停止中）
 */
const tones = {
  mint: 'bg-mint-soft text-ink',
  neutral: 'bg-line-soft text-muted',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
} as const

export type BadgeTone = keyof typeof tones

type Props = {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export const Badge = ({ tone = 'mint', children, className = '' }: Props) => (
  <span
    className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold ${tones[tone]} ${className}`}
  >
    {children}
  </span>
)
