import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { CoachProfileForm } from '@/app/features/coach-settings/components/CoachProfileForm'
import { PlansForm } from '@/app/features/coach-settings/components/PlansForm'
import { getCurrentCoach } from '@/server/features/coach/presentation/queries'

export const metadata: Metadata = { title: '設定' }

const CoachSettingsPage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') redirect('/coach')
  const { settings } = current

  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">設定</h1>
      <Card className="space-y-4">
        <h2 className="font-bold">プロフィール</h2>
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
