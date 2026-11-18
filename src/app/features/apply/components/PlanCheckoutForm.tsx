'use client'

import { useActionState, useState } from 'react'
import { TurnstileWidget } from '@/app/components/TurnstileWidget'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { formatYen } from '@/app/utils/format'
import type { ApplyPageDto } from '@/server/features/purchase/application/dto/ApplyPage.dto'
import { startApplicationAction } from '@/server/features/purchase/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'
import { SYSTEM_FEE_NOTE, systemFeeFor } from '../utils/systemFeeText'

type Props = {
  coachSlug: string
  plans: ApplyPageDto['coach']['plans']
  student: ApplyPageDto['student']
  /** ボット対策（Turnstile）のサイトキー */
  turnstileSiteKey: string
  /** コーチが不在・返信遅れのとき、了承チェックの文言。了承が要らなければ null */
  delayAckLabel: string | null
}

/** プランを選んで申し込む（悩みと動画を送る画面へ。請求はコーチが受け付けたとき） */
export const PlanCheckoutForm = ({
  coachSlug,
  plans,
  student,
  turnstileSiteKey,
  delayAckLabel,
}: Props) => {
  const [state, action, pending] = useActionState(startApplicationAction, IDLE_ACTION_STATE)
  const [acknowledged, setAcknowledged] = useState(false)
  const needsAck = student !== null && delayAckLabel !== null

  const unavailableReason = (kind: Props['plans'][number]['kind']): string | null => {
    if (kind === 'trial' && student?.trialUsed) return '利用済み'
    if (kind === 'monthly' && student?.subscribed) return '申し込み済み'
    return null
  }
  const firstAvailable = plans.find((plan) => unavailableReason(plan.kind) === null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="coachSlug" value={coachSlug} />
      <fieldset className="space-y-3">
        <legend className="sr-only">プラン</legend>
        {plans.map((plan) => {
          const reason = unavailableReason(plan.kind)
          return (
            <label
              key={plan.kind}
              className={`rounded-card has-checked:border-mint has-checked:bg-mint-soft border-line flex cursor-pointer items-start gap-3 border p-4 ${
                reason ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <input
                type="radio"
                name="planKind"
                value={plan.kind}
                disabled={reason !== null}
                defaultChecked={plan.kind === firstAvailable?.kind}
                className="accent-mint mt-1"
              />
              <span className="flex-1">
                <span className="flex items-baseline justify-between">
                  <span className="font-bold">{plan.name}</span>
                  <span className="font-bold">
                    {formatYen(plan.priceYen)}
                    {plan.kind === 'monthly' && <span className="text-sm font-normal">/月</span>}
                  </span>
                </span>
                <span className="text-muted mt-1 block text-sm">{reason ?? plan.description}</span>
                <span className="text-caption text-muted mt-1 block">
                  ＋システム利用料{formatYen(systemFeeFor(plan.priceYen))}
                  {plan.kind === 'monthly' ? '／月' : ''}（お支払い{' '}
                  {formatYen(plan.priceYen + systemFeeFor(plan.priceYen))}
                  {plan.kind === 'monthly' ? '／月' : ''}）
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>
      {/* ログインしていなければ、先にログインへ進むので要らない。送ったあとは作り直す（トークンは1回きり） */}
      {student && (
        <TurnstileWidget
          key={state.status === 'idle' ? 'idle' : state.message}
          siteKey={turnstileSiteKey}
          action="checkout"
        />
      )}
      {needsAck && (
        <label className="bg-warning-soft flex items-start gap-2 rounded-xl p-3 text-sm">
          <input
            type="checkbox"
            name="acknowledgeDelay"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.currentTarget.checked)}
            className="accent-mint mt-1"
          />
          {delayAckLabel}
        </label>
      )}
      <FormMessage state={state} />
      <Button
        type="submit"
        disabled={pending || !firstAvailable || (needsAck && !acknowledged)}
        size="lg"
        className="w-full"
      >
        {student ? '申し込みへ進む' : 'ログインして申し込む'}
      </Button>
      <p className="text-caption text-muted">
        悩みと動画を送ってカードを登録すると申し込めます。請求されるのは、コーチが内容を見て受け付けたときです（月額は、そこから毎月自動で請求されます）。
        {SYSTEM_FEE_NOTE}お支払いは Stripe の画面で行い、カード番号は SwingPost に保存されません。
      </p>
    </form>
  )
}
