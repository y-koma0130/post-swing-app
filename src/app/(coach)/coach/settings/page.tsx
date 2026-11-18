import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { AvatarUploader } from '@/app/features/coach-settings/components/AvatarUploader'
import { CoachProfileForm } from '@/app/features/coach-settings/components/CoachProfileForm'
import { PayoutSection } from '@/app/features/coach-settings/components/PayoutSection'
import { PlansForm } from '@/app/features/coach-settings/components/PlansForm'
import {
  getCurrentCoach,
  refreshCurrentCoachPayout,
} from '@/server/features/coach/presentation/queries'
import { getSiteUrl } from '@/server/utils/siteUrl'

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
    <Page layout="form">
      <PageHeader title="設定" />
      <Card className="space-y-4">
        <h2 className="text-heading">売上の受け取り</h2>
        <PayoutSection settings={settings} />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-heading">プロフィール</h2>
        <AvatarUploader name={settings.name} avatarUrl={settings.avatarUrl} />
        <CoachProfileForm settings={settings} siteUrl={getSiteUrl().origin} />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-heading">プラン</h2>
        <PlansForm plans={settings.plans} />
      </Card>
    </Page>
  )
}

export default CoachSettingsPage
