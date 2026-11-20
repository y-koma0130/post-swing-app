import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/app/components/Logo'
import { StagingBadge } from '@/app/components/StagingBadge'
import { SignOutButton } from '@/app/features/auth/components/SignOutButton'
import { CoachNav } from '@/app/features/coach-nav/components/CoachNav'
import { formatDateTime } from '@/app/utils/format'
import { getActor } from '@/server/auth/getActor'
import { getCurrentDemoExpiry } from '@/server/features/demo/presentation/queries'

type Props = {
  children: ReactNode
}

// コーチ向け：タブレット・PC前提
const CoachLayout = async ({ children }: Props) => {
  const [actor, demoExpiry] = await Promise.all([getActor(), getCurrentDemoExpiry()])

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
      {demoExpiry && (
        // デモのコーチ（staging でコーチ候補が試すもの）。実際には送られない・届かないことを伝える
        <div className="bg-mint-soft border-line-soft border-b">
          <p className="text-body mx-auto max-w-6xl px-6 py-2 text-sm">
            これはデモです。生徒・レッスンは架空で、通知やお支払いは実際には行われません。
            {formatDateTime(demoExpiry)}にデータごと消えます。
          </p>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}

export default CoachLayout
