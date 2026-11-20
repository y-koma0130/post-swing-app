import Link from 'next/link'
import type { ReactNode } from 'react'
import { navLinkClass } from '@/app/components/ui/linkStyles'

/**
 * ページの幅と余白（画面ごとに決めず、用途で選ぶ）
 * - form：設定などの入力画面（コーチ）
 * - list：一覧（コーチのホーム）
 * - wide：作業画面（添削）。レイアウトの幅いっぱい
 * - student：生徒の画面（スマホ前提。レイアウトが幅を決める）
 */
const layouts = {
  form: 'mx-auto w-full max-w-2xl space-y-8',
  list: 'mx-auto w-full max-w-3xl space-y-6',
  wide: 'w-full space-y-6',
  student: 'space-y-6 px-6 pt-6 pb-10',
} as const

export type PageLayout = keyof typeof layouts

type PageProps = {
  layout: PageLayout
  children: ReactNode
}

export const Page = ({ layout, children }: PageProps) => (
  <main className={layouts[layout]}>{children}</main>
)

type PageHeaderProps = {
  title: ReactNode
  /** 見出しの上の小さな文字（「山田 太郎 さんの添削」など） */
  eyebrow?: ReactNode
  /** 見出しの下の説明 */
  description?: ReactNode
  /** 戻り先（「← マイページ」など） */
  back?: { href: string; label: string } | undefined
  /** 見出しの右に置く操作 */
  actions?: ReactNode
}

/** ページの見出し。どの画面も同じ形にする */
export const PageHeader = ({ title, eyebrow, description, back, actions }: PageHeaderProps) => (
  <header className="space-y-2">
    {back && (
      <div>
        <Link href={back.href} className={`text-caption ${navLinkClass}`}>
          ← {back.label}
        </Link>
      </div>
    )}
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        {eyebrow && <div className="text-caption text-muted">{eyebrow}</div>}
        <h1 className="text-title">{title}</h1>
      </div>
      {actions}
    </div>
    {description && <p className="text-muted text-sm">{description}</p>}
  </header>
)
