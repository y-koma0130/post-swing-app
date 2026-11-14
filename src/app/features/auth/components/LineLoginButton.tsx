'use client'

import { useState } from 'react'
import { authClient } from '@/app/utils/authClient'

type Props = {
  /** ログイン後に開くページ */
  redirectTo: string
}

/** LINE でログイン。ログインの途中で公式アカウントの友だち追加も案内される */
export const LineLoginButton = ({ redirectTo }: Props) => {
  const [pending, setPending] = useState(false)

  const signIn = async () => {
    setPending(true)
    await authClient.signIn.social({ provider: 'line', callbackURL: redirectTo })
    setPending(false)
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      className="w-full rounded-full bg-[#06C755] px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
    >
      LINE でログイン
    </button>
  )
}
