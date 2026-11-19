'use client'

import { useState } from 'react'
import { Spinner } from '@/app/components/ui/Button'
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
    // 成功すると LINE の画面へ移るので、そのまま「移動中」にしておく。失敗したときだけ戻す
    const result = await authClient.signIn.social({ provider: 'line', callbackURL: redirectTo })
    if (result.error) setPending(false)
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#06C755] px-6 py-3.5 text-base font-semibold text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-80"
    >
      {pending && <Spinner />}
      {pending ? 'LINE に移動しています…' : 'LINE でログイン'}
    </button>
  )
}
