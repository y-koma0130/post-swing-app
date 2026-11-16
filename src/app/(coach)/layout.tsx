import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/app/components/Logo'
import { SignOutButton } from '@/app/features/auth/components/SignOutButton'
import { getActor } from '@/server/auth/getActor'

type Props = {
  children: ReactNode
}

// コーチ向け：タブレット・PC前提
const CoachLayout = async ({ children }: Props) => {
  const actor = await getActor()

  return (
    <div className="bg-surface min-h-dvh">
      <header className="border-line-soft border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
          <Link href="/coach">
            <Logo height={36} />
          </Link>
          {actor && (
            <nav className="-mx-1 flex items-center gap-5 overflow-x-auto px-1 text-sm whitespace-nowrap">
              <Link href="/coach" className="text-body hover:text-ink">
                ホーム
              </Link>
              <Link href="/coach/drills" className="text-body hover:text-ink">
                ドリル
              </Link>
              <Link href="/coach/availability" className="text-body hover:text-ink">
                不在・返信
              </Link>
              <Link href="/coach/settings" className="text-body hover:text-ink">
                設定
              </Link>
              <SignOutButton redirectTo="/coach/login" />
            </nav>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}

export default CoachLayout
