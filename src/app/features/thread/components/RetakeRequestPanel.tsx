'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { formatDateTime } from '@/app/utils/format'
import { RETAKE_REASON_LABEL, RETAKE_REASONS } from '@/app/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import { requestRetakeAction } from '@/server/features/thread/presentation/retakeActions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Request = ThreadDetailDto['retake']['requests'][number]

type Props = {
  threadId: string
  submissionId: string
  /** この提出への撮り直しのお願い（古い順） */
  requests: Request[]
  /** いまお願いできるか（添削を待っている、いちばん新しい提出で、開いているお願いがない） */
  canRequest: boolean
  /** このスレッドであと何回お願いできるか */
  remaining: number
}

const statusText = (request: Request): string | null => {
  switch (request.closeReason) {
    case null:
      return '生徒の返事を待っています（そのあいだ、返信の目安は止まっています）。いまの動画で添削してもかまいません'
    case 'resent':
      return `撮り直しが届きました（${request.closedAt ? formatDateTime(request.closedAt) : ''}）`
    case 'declined':
      return '生徒は今は撮り直せないそうです。いまの動画で添削をお願いします'
    case 'replied':
      return null
  }
}

/**
 * コーチの提出カードの下：撮り直しのお願いの様子と、お願いするボタン（提出の回数には数えない）
 */
export const RetakeRequestPanel = ({
  threadId,
  submissionId,
  requests,
  canRequest,
  remaining,
}: Props) => {
  const [state, action, pending] = useActionState(requestRetakeAction, IDLE_ACTION_STATE)
  const [open, setOpen] = useState(false)
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.status === 'success') setOpen(false)
  }

  const shown = requests.filter((r) => statusText(r) !== null)
  if (shown.length === 0 && !canRequest && state.status !== 'success') return null

  return (
    <div className="space-y-2">
      {shown.map((request) => (
        <div key={request.id} className="bg-warning-soft space-y-1 rounded-lg p-3 text-sm">
          <p className="text-body font-bold">
            撮り直しのお願い：{RETAKE_REASON_LABEL[request.reason]}
          </p>
          {request.message && <p className="text-body whitespace-pre-wrap">{request.message}</p>}
          <p className="text-caption text-muted">{statusText(request)}</p>
        </div>
      ))}
      {state.status === 'success' && <FormMessage state={state} />}
      {canRequest && !open && (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          撮り直しをお願いする（あと{remaining}回）
        </Button>
      )}
      {canRequest && open && (
        <form action={action} className="border-line space-y-3 rounded-lg border bg-white p-3">
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="submissionId" value={submissionId} />
          <p className="text-caption text-muted">
            提出の回数には数えません。いまの動画はそのまま使えるので、撮り直しを待たずに添削することもできます。このレッスンであと
            {remaining}回お願いできます。
          </p>
          <fieldset className="space-y-1">
            <legend className={labelTextClass}>理由</legend>
            {RETAKE_REASONS.map((reason, i) => (
              <label key={reason} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  defaultChecked={i === 0}
                  className="accent-mint"
                />
                {RETAKE_REASON_LABEL[reason]}
              </label>
            ))}
          </fieldset>
          <label className="block space-y-1">
            <span className={labelTextClass}>ひとこと（任意）</span>
            <textarea
              name="message"
              rows={2}
              maxLength={200}
              placeholder="例：足元からクラブの先まで入るように、少し離れて撮ってください"
              className={inputClass}
            />
          </label>
          <FormMessage state={state} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" pending={pending}>
              {pending ? 'お願いしています…' : '撮り直しをお願いする'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              やめる
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
