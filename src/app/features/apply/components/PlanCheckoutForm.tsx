'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { formatYen } from '@/app/utils/format'
import type { ApplyPageDto } from '@/server/features/purchase/application/dto/ApplyPage.dto'
import { startCheckoutAction } from '@/server/features/purchase/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  coachSlug: string
  plans: ApplyPageDto['coach']['plans']
  student: ApplyPageDto['student']
}

/** プランを選んで Stripe の支払い画面へ進む */
export const PlanCheckoutForm = ({ coachSlug, plans, student }: Props) => {
  const [state, action, pending] = useActionState(startCheckoutAction, IDLE_ACTION_STATE)

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
              className={`rounded-card has-checked:border-mint has-checked:bg-mint-soft flex cursor-pointer items-start gap-3 border border-gray-200 p-4 ${
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
                <span className="mt-1 block text-sm text-gray-500">
                  {reason ?? plan.description}
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending || !firstAvailable} className="w-full">
        {student ? 'お支払いへ進む' : 'ログインして申し込む'}
      </Button>
      <p className="text-xs text-gray-500">
        お支払いは Stripe の画面で行います。カード番号は SwingPost に保存されません。
      </p>
    </form>
  )
}
