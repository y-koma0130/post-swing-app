'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import type { CoachSettingsDto } from '@/server/features/coach/application/dto/CoachSettings.dto'
import {
  openPayoutDashboardAction,
  startPayoutOnboardingAction,
} from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  settings: Pick<CoachSettingsDto, 'chargesEnabled' | 'hasStripeAccount'>
}

/** 売上を受け取る口座（Stripe）の状態と、設定・確認の入口 */
export const PayoutSection = ({ settings }: Props) => {
  if (settings.chargesEnabled) {
    return <PayoutDashboardForm />
  }
  return <PayoutOnboardingForm hasStripeAccount={settings.hasStripeAccount} />
}

const PayoutDashboardForm = () => {
  const [state, action, pending] = useActionState(openPayoutDashboardAction, IDLE_ACTION_STATE)
  return (
    <div className="space-y-3">
      <p className="text-body text-sm">
        口座の設定が済んでいます。受付ページから申し込みを受けられます。
      </p>
      <form action={action} className="space-y-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          売上・入金を確かめる（Stripe）
        </Button>
        <FormMessage state={state} />
      </form>
    </div>
  )
}

const PayoutOnboardingForm = ({ hasStripeAccount }: { hasStripeAccount: boolean }) => {
  const [state, action, pending] = useActionState(startPayoutOnboardingAction, IDLE_ACTION_STATE)
  return (
    <div className="space-y-3">
      <p className="text-body text-sm">
        {hasStripeAccount
          ? '口座の設定が途中です。続きを入力すると、申し込みを受けられるようになります。'
          : '売上を受け取る口座を設定すると、受付ページから申し込みを受けられるようになります。決済と入金は Stripe が行います。'}
      </p>
      <form action={action} className="space-y-2">
        <Button type="submit" disabled={pending}>
          {hasStripeAccount ? '設定の続きへ' : '口座を設定する'}
        </Button>
        <FormMessage state={state} />
      </form>
    </div>
  )
}
