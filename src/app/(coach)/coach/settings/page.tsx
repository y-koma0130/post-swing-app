import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { AvatarUploader } from '@/app/features/coach-settings/components/AvatarUploader'
import { CoachProfileForm } from '@/app/features/coach-settings/components/CoachProfileForm'
import { PayoutSection } from '@/app/features/coach-settings/components/PayoutSection'
import { PlansForm } from '@/app/features/coach-settings/components/PlansForm'
import {
  getCurrentCoach,
  refreshCurrentCoachPayout,
} from '@/server/features/coach/presentation/queries'

export const metadata: Metadata = { title: '設定' }

const CoachSettingsPage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') redirect('/coach')
  // 口座の設定が途中なら、Stripe に状態を問い合わせ直す（審査が後から終わることがあるため）
  const payout =
    current.settings.hasStripeAccount && !current.settings.chargesEnabled
      ? await refreshCurrentCoachPayout()
      : null
  const settings =
    payout?.ok === true
      ? { ...current.settings, chargesEnabled: payout.value.chargesEnabled }
      : current.settings

  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">設定</h1>
      <Card className="space-y-4">
        <h2 className="font-bold">売上の受け取り</h2>
        <PayoutSection settings={settings} />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-bold">プロフィール</h2>
        <AvatarUploader name={settings.name} avatarUrl={settings.avatarUrl} />
        <CoachProfileForm settings={settings} />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-bold">プラン</h2>
        <PlansForm plans={settings.plans} />
      </Card>
    </main>
  )
}

export default CoachSettingsPage
