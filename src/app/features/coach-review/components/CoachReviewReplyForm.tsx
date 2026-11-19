'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { replyToCoachReviewAction } from '@/server/features/coach-review/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  threadId: string
}

export const CoachReviewReplyForm = ({ threadId }: Props) => {
  const [state, action, pending] = useActionState(replyToCoachReviewAction, IDLE_ACTION_STATE)
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="threadId" value={threadId} />
      <textarea
        name="reply"
        required
        rows={2}
        maxLength={1000}
        placeholder="お礼や補足"
        className={inputClass}
      />
      <FormMessage state={state} />
      <Button type="submit" pending={pending} variant="secondary">
        返信する
      </Button>
    </form>
  )
}
