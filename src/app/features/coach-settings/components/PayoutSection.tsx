import { Button } from '@/app/components/ui/Button'
import type { CoachSettingsDto } from '@/server/features/coach/application/dto/CoachSettings.dto'
import {
  openPayoutDashboardAction,
  startPayoutOnboardingAction,
} from '@/server/features/coach/presentation/actions'

type Props = {
  settings: Pick<CoachSettingsDto, 'chargesEnabled' | 'hasStripeAccount'>
}

/** 売上を受け取る口座（Stripe）の状態と、設定・確認の入口 */
export const PayoutSection = ({ settings }: Props) => {
  if (settings.chargesEnabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          口座の設定が済んでいます。受付ページから申し込みを受けられます。
        </p>
        <form action={openPayoutDashboardAction}>
          <Button type="submit" variant="secondary">
            売上・入金を確かめる（Stripe）
          </Button>
        </form>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        {settings.hasStripeAccount
          ? '口座の設定が途中です。続きを入力すると、申し込みを受けられるようになります。'
          : '売上を受け取る口座を設定すると、受付ページから申し込みを受けられるようになります。決済と入金は Stripe が行います。'}
      </p>
      <form action={startPayoutOnboardingAction}>
        <Button type="submit">
          {settings.hasStripeAccount ? '設定の続きへ' : '口座を設定する'}
        </Button>
      </form>
    </div>
  )
}
