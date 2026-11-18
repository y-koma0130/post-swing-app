import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/app/components/Logo'
import { StagingBadge } from '@/app/components/StagingBadge'
import { SignOutButton } from '@/app/features/auth/components/SignOutButton'
import { CoachNav } from '@/app/features/coach-nav/components/CoachNav'
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/coach">
              <Logo height={36} />
            </Link>
            <StagingBadge />
          </div>
          {actor && (
            <>
              <CoachNav />
              <SignOutButton redirectTo="/coach/login" />
            </>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}

export default CoachLayout
