'use client'

import { authClient } from '@/app/utils/authClient'

type Props = {
  redirectTo: string
}

export const SignOutButton = ({ redirectTo }: Props) => {
  const signOut = async () => {
    await authClient.signOut()
    window.location.assign(redirectTo)
  }

  return (
    <button type="button" onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800">
      ログアウト
    </button>
  )
}
