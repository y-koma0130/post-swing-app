'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { formatDateTime } from '@/app/utils/format'
import {
  approveApplicationAction,
  declineApplicationAction,
} from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'
import { COACH_DECLINE_REASON_OPTION } from '../utils/threadText'

type Props = {
  threadId: string
  studentName: string
  /** 返事の期限 */
  deadline: Date | null
}

/**
 * 承認待ちの申し込みに、受けるか断るかを決める（悩みと動画は下の時系列で見る）
 */
export const ApplicationDecision = ({ threadId, studentName, deadline }: Props) => {
  const [approveState, approve, approving] = useActionState(
    approveApplicationAction,
    IDLE_ACTION_STATE
  )
  const [declineState, decline, declining] = useActionState(
    declineApplicationAction,
    IDLE_ACTION_STATE
  )
  const [declineOpen, setDeclineOpen] = useState(false)
  const pending = approving || declining

  return (
    <section className="border-mint bg-mint-soft space-y-3 rounded-2xl border p-5">
      <div className="space-y-1">
        <h2 className="text-heading">{studentName || '生徒'}さんから申し込みがありました</h2>
        <p className="text-body text-sm">
          下の悩みと動画を見て、受けるか決めてください
          {deadline ? `（${formatDateTime(deadline)}まで）` : ''}
          。受けると生徒への請求が確定し、添削を始められます。期限までに決めないと、自動でお断りします。
        </p>
      </div>
      <FormMessage state={approveState} />
      {!declineOpen && (
        <form action={approve} className="flex flex-wrap gap-2">
          <input type="hidden" name="threadId" value={threadId} />
          <Button type="submit" pending={approving} disabled={declining}>
            {approving ? '受け付けています…' : '受ける'}
          </Button>
          <Button variant="secondary" onClick={() => setDeclineOpen(true)} disabled={pending}>
            お断りする
          </Button>
        </form>
      )}
      {declineOpen && (
        <form action={decline} className="space-y-3 rounded-xl bg-white p-4">
          <input type="hidden" name="threadId" value={threadId} />
          <fieldset className="space-y-2">
            <legend className={labelTextClass}>理由（生徒に伝わります）</legend>
            {Object.entries(COACH_DECLINE_REASON_OPTION).map(([value, label], i) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  defaultChecked={i === 0}
                  className="accent-mint"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="block space-y-1">
            <span className={labelTextClass}>ひとこと（任意）</span>
            <textarea
              name="message"
              rows={2}
              maxLength={200}
              placeholder="例：アプローチの添削が得意なコーチをおすすめします"
              className={inputClass}
            />
          </label>
          <FormMessage state={declineState} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" pending={declining} disabled={approving}>
              {declining ? 'お断りしています…' : 'お断りする（請求されません）'}
            </Button>
            <Button variant="ghost" onClick={() => setDeclineOpen(false)} disabled={pending}>
              やめる
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
