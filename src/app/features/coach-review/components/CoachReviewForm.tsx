'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { submitCoachReviewAction } from '@/server/features/coach-review/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  threadId: string
}

/** 終わったスレッドで、生徒がコーチをレビューする */
export const CoachReviewForm = ({ threadId }: Props) => {
  const [state, action, pending] = useActionState(submitCoachReviewAction, IDLE_ACTION_STATE)
  if (state.status === 'success') {
    return <FormMessage state={state} />
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />
      <fieldset className="flex gap-2">
        <legend className="mb-2 text-sm font-bold">満足度</legend>
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className="cursor-pointer">
            <input type="radio" name="rating" value={rating} required className="peer sr-only" />
            <span className="peer-checked:bg-mint peer-checked:text-ink block rounded-full border border-gray-200 px-3 py-1 text-sm">
              ★{rating}
            </span>
          </label>
        ))}
      </fieldset>
      <textarea
        name="comment"
        rows={3}
        maxLength={1000}
        placeholder="よかったところ（受付ページに名前なしで載ります）"
        className={inputClass}
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        レビューを送る
      </Button>
    </form>
  )
}
