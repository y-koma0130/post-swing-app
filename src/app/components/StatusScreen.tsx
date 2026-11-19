import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/app/components/Logo'

type Props = {
  /** 大きく出す短い記号（404 など）。なければ出さない */
  code?: string | undefined
  title: string
  description: ReactNode
  /** 下に並べるボタン */
  actions: ReactNode
  /**
   * standalone：レイアウトの外（存在しない URL など）。ロゴを出し、画面いっぱいに置く
   * inline：生徒・コーチのレイアウトの中。ヘッダーにロゴがあるので出さない
   */
  placement?: 'standalone' | 'inline' | undefined
}

/** 404・エラーなど、ページの代わりに出す画面 */
export const StatusScreen = ({
  code,
  title,
  description,
  actions,
  placement = 'standalone',
}: Props) => (
  <main
    className={`flex flex-col items-center justify-center px-6 text-center ${
      placement === 'standalone' ? 'bg-surface min-h-dvh py-16' : 'py-20'
    }`}
  >
    {placement === 'standalone' && (
      <Link href="/" aria-label="SwingPost トップ" className="mb-10">
        <Logo height={32} />
      </Link>
    )}
    <div className="max-w-sm space-y-3">
      {code && <p className="text-mint-text text-5xl font-bold tracking-tight">{code}</p>}
      <h1 className="text-title">{title}</h1>
      <p className="text-muted text-sm leading-relaxed">{description}</p>
    </div>
    <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
  </main>
)
