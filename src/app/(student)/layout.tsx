import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/app/components/Logo'
import { SiteFooter } from '@/app/components/SiteFooter'
import { getActor } from '@/server/auth/getActor'

type Props = {
  children: ReactNode
}

/**
 * 生徒向け：スマホ前提の1カラム
 *
 * 受付ページはコーチのページなので、ヘッダーは控えめにする（ロゴは小さく、項目はマイページだけ）
 */
const StudentLayout = async ({ children }: Props) => {
  const actor = await getActor()

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
        <Link href={actor ? '/me' : '/'} aria-label="SwingPost">
          <Logo height={28} />
        </Link>
        <Link
          href={actor ? '/me' : '/login?next=/me'}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {actor ? 'マイページ' : 'ログイン'}
        </Link>
      </header>
      {children}
      <SiteFooter />
    </div>
  )
}

export default StudentLayout
