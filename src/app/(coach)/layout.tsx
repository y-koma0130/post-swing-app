import Link from 'next/link'
import type { ReactNode } from 'react'
import { SignOutButton } from '@/app/features/auth/components/SignOutButton'
import { getActor } from '@/server/auth/getActor'

type Props = {
  children: ReactNode
}

// コーチ向け：タブレット・PC前提
const CoachLayout = async ({ children }: Props) => {
  const actor = await getActor()

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/coach" className="text-ink font-bold">
            SwingPost
          </Link>
          {actor && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{actor.name}</span>
              <SignOutButton redirectTo="/coach/login" />
            </div>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}

export default CoachLayout
