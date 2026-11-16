'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { joinWaitlistAction } from '@/server/features/purchase/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  coachSlug: string
  onWaitlist: boolean
}

export const WaitlistForm = ({ coachSlug, onWaitlist }: Props) => {
  const [state, action, pending] = useActionState(joinWaitlistAction, IDLE_ACTION_STATE)

  if (onWaitlist) {
    return (
      <p className="bg-mint-soft text-ink rounded-xl p-4 text-sm">
        キャンセル待ちに登録済みです。空きが出たら LINE でお知らせします。
      </p>
    )
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="coachSlug" value={coachSlug} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        キャンセル待ちに登録する
      </Button>
    </form>
  )
}
