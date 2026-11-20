'use client'

import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { useActionForm } from '@/app/hooks/useActionForm'
import { replyToCoachReviewAction } from '@/server/features/coach-review/presentation/actions'

type Props = {
  threadId: string
}

/** コーチがレビューに返信する（1回だけ）。生徒のレッスンの画面と受付ページに出て、生徒には LINE で知らせる */
export const CoachReviewReplyForm = ({ threadId }: Props) => {
  const { state, pending, onSubmit } = useActionForm(replyToCoachReviewAction)
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <input type="hidden" name="threadId" value={threadId} />
      <textarea
        name="reply"
        required
        rows={2}
        maxLength={1000}
        placeholder="お礼や補足"
        className={inputClass}
      />
      <p className="text-caption text-muted">
        返信は、生徒のレッスンの画面と、受付ページのレビューに表示され、生徒には LINE
        でお知らせします。
      </p>
      <FormMessage state={state} />
      <Button type="submit" pending={pending} variant="secondary">
        返信する
      </Button>
    </form>
  )
}
