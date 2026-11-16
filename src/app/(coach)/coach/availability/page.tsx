import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { AbsenceForm } from '@/app/features/coach-availability/components/AbsenceForm'
import { AbsenceList } from '@/app/features/coach-availability/components/AbsenceList'
import { DelayFlagToggle } from '@/app/features/coach-availability/components/DelayFlagToggle'
import {
  getCurrentCoach,
  getCurrentCoachAvailabilitySettings,
} from '@/server/features/coach/presentation/queries'

export const metadata: Metadata = { title: '不在・返信の設定' }

/** 不在期間と返信遅れの設定 */
const CoachAvailabilityPage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') redirect('/coach')
  const settings = await getCurrentCoachAvailabilitySettings()
  if (!settings) redirect('/coach')
  const coachName = current.settings.name

  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">不在・返信の設定</h1>
        <p className="text-sm text-gray-600">
          動画の添削は{settings.replyTargetHours}
          時間以内に返すのが基本の約束です。守れない期間は、生徒に前もって知らせましょう。
        </p>
      </div>
      <Card className="space-y-4">
        <h2 className="font-bold">不在期間</h2>
        <AbsenceList coachName={coachName} settings={settings} />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-bold">不在期間を追加</h2>
        <AbsenceForm
          coachName={coachName}
          absence={null}
          today={settings.today}
          noteMaxLength={settings.noteMaxLength}
        />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-bold">返信が遅れる場合があります</h2>
        <p className="text-sm text-gray-600">
          期間を決めずに、少し返信が遅れそうなときに使います。受付ページと動画を送る前に表示されます。
        </p>
        <DelayFlagToggle
          active={settings.delayFlag.active}
          expiresAt={settings.delayFlag.expiresAt}
        />
      </Card>
    </main>
  )
}

export default CoachAvailabilityPage
