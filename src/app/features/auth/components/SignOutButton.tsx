'use client'

import { useState } from 'react'
import { authClient } from '@/app/utils/authClient'

type Props = {
  redirectTo: string
}

export const SignOutButton = ({ redirectTo }: Props) => {
  const [pending, setPending] = useState(false)
  const signOut = async () => {
    setPending(true)
    await authClient.signOut()
    window.location.assign(redirectTo)
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-busy={pending || undefined}
      className="text-muted hover:text-ink active:text-ink text-sm disabled:cursor-wait"
    >
      {pending ? 'ログアウトしています…' : 'ログアウト'}
    </button>
  )
}
