'use client'

import { useActionState } from 'react'
import { FormMessage } from '@/app/components/ui/FormMessage'
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

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const message = suspended
          ? `${coachName}さんの受付を再開しますか？`
          : `${coachName}さんの受付を止めますか？\n新しい申し込みを受けなくなります（進行中のスレッドは続きます）。`
        if (!window.confirm(message)) event.preventDefault()
      }}
      className="space-y-1"
    >
      <input type="hidden" name="coachUserId" value={coachUserId} />
      <input type="hidden" name="suspended" value={suspended ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-gray-200 px-3 py-1 text-xs disabled:opacity-40"
      >
        {suspended ? '受付を再開' : '受付を止める'}
      </button>
      <FormMessage state={state} />
    </form>
  )
}
