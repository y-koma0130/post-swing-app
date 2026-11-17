import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/app/components/Logo'
import { SiteFooter } from '@/app/components/SiteFooter'
import { getCurrentCoach } from '@/server/features/coach/presentation/queries'

type Props = {
  children: ReactNode
}

/**
 * 生徒向け：スマホ前提の1カラム
 *
 * 受付ページはコーチのページなので、ヘッダーは控えめにする（項目はマイページだけ）。ロゴの高さはコーチの画面とそろえる。
 * コーチが自分の受付ページを見に来たときは、マイページの代わりにコーチ画面へ戻る入口を出す
 */
const StudentLayout = async ({ children }: Props) => {
  const viewer = await getCurrentCoach()
  const nav =
    viewer.kind === 'coach'
      ? { home: '/coach', href: '/coach', label: 'コーチ画面へ' }
      : viewer.kind === 'not_coach'
        ? { home: '/me', href: '/me', label: 'マイページ' }
        : { home: '/', href: '/login?next=/me', label: 'ログイン' }

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-white">
      <header className="border-line-soft flex items-center justify-between border-b px-6 py-3">
        <Link href={nav.home} aria-label="SwingPost">
          <Logo height={36} />
        </Link>
        <Link href={nav.href} className="text-muted hover:text-ink text-sm">
          {nav.label}
        </Link>
      </header>
      {children}
      <SiteFooter />
    </div>
  )
}

export default StudentLayout
