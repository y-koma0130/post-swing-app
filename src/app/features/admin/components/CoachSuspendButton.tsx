'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { useConfirmedSubmit } from '@/app/hooks/useConfirmedSubmit'
import { setCoachSuspendedAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  coachUserId: string
  coachName: string
  suspended: boolean
}

/** コーチの受付を止める・再開する。止めても進行中のスレッドは続く */
export const CoachSuspendButton = ({ coachUserId, coachName, suspended }: Props) => {
  const [state, action, pending] = useActionState(setCoachSuspendedAction, IDLE_ACTION_STATE)
  const confirm = useConfirmedSubmit({
    message: suspended
      ? `${coachName}さんの受付を再開しますか？`
      : `${coachName}さんの受付を止めますか？\n新しい申し込みを受けなくなります（進行中のスレッドは続きます）。`,
    confirmLabel: suspended ? '再開する' : '止める',
    danger: !suspended,
  })

  return (
    <form action={action} onSubmit={confirm.onSubmit} className="space-y-1">
      {confirm.dialog}
      <input type="hidden" name="coachUserId" value={coachUserId} />
      <input type="hidden" name="suspended" value={suspended ? 'false' : 'true'} />
      <Button type="submit" variant="secondary" size="sm" pending={pending}>
        {suspended ? '受付を再開' : '受付を止める'}
      </Button>
      <FormMessage state={state} />
    </form>
  )
}
