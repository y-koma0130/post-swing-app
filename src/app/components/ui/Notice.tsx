import type { ReactNode } from 'react'

/**
 * お知らせの枠（画面の中で目に入れてほしい案内・操作を促す区分）。画面ごとに作らず、これを使う
 *
 * - neutral：ふつうの案内（受付を止めている、など）
 * - mint：うれしいこと・次にしてほしいこと（申し込みがあった、送れた、など）
 * - warning：注意（不在・返信の遅れ、撮り直しのお願い、など）
 * - line：LINE の案内（LINE の色）
 *
 * emphasis：操作が要るとき（承認・撮り直しなど）は枠線を付けて目立たせる
 */
const tones = {
  neutral: { box: 'bg-surface text-body', border: 'border-line' },
  mint: { box: 'bg-mint-soft text-body', border: 'border-mint' },
  warning: { box: 'bg-warning-soft text-body', border: 'border-warning/30' },
  line: { box: 'bg-[#06C755]/5 text-body', border: 'border-[#06C755]/40' },
} as const

export type NoticeTone = keyof typeof tones

type Props = {
  tone?: NoticeTone | undefined
  /** 見出し（なければ本文だけ） */
  title?: ReactNode
  emphasis?: boolean | undefined
  /** 読み上げで「状態のお知らせ」として伝えるか */
  status?: boolean | undefined
  className?: string | undefined
  children?: ReactNode
}

export const Notice = ({
  tone = 'neutral',
  title,
  emphasis = false,
  status = false,
  className = '',
  children,
}: Props) => (
  <section
    role={status ? 'status' : undefined}
    className={`space-y-2 rounded-xl p-4 text-sm ${tones[tone].box} ${
      emphasis || tone === 'line' ? `border ${tones[tone].border}` : ''
    } ${className}`}
  >
    {title && <h2 className="text-heading text-ink">{title}</h2>}
    {children}
  </section>
)
