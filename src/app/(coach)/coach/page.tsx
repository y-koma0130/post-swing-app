import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { Page } from '@/app/components/ui/Page'
import { AvailabilityBanner } from '@/app/features/coach-availability/components/AvailabilityBanner'
import { ThreadList } from '@/app/features/thread/components/ThreadList'
import {
  getCurrentCoach,
  getCurrentCoachAvailabilitySettings,
} from '@/server/features/coach/presentation/queries'
import { getCoachThreadSummaries } from '@/server/features/thread/presentation/queries'

/** コーチのホーム */
const CoachHomePage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') {
    return (
      <main className="mx-auto max-w-md">
        <Card className="space-y-2">
          <h1 className="text-title">コーチとして登録されていません</h1>
          <p className="text-muted text-sm">
            SwingPost は招待制です。招待を受けたメールアドレスでログインしてください。
          </p>
        </Card>
      </main>
    )
  }
  const { settings, actor } = current
  const [threads, availability] = await Promise.all([
    getCoachThreadSummaries(actor.userId),
    getCurrentCoachAvailabilitySettings(),
  ])

  return (
    <Page layout="list">
      {availability && <AvailabilityBanner availability={availability.availability} />}
      {!settings.chargesEnabled && (
        <Card className="border-warning/30 bg-warning-soft space-y-1">
          <p className="font-bold">まだ申し込みを受け付けていません</p>
          <p className="text-body text-sm">
            売上を受け取る口座を設定すると、受付ページから申し込めるようになります。
            <Link href="/coach/settings" className="ml-1 underline">
              設定へ
            </Link>
          </p>
        </Card>
      )}
      <h1 className="text-title">スレッド</h1>
      {threads.length === 0 ? (
        <p className="text-muted text-sm">
          まだスレッドはありません。受付ページを生徒に案内しましょう（/c/{settings.slug}）。
        </p>
      ) : (
        <ThreadList threads={threads} viewer="coach" />
      )}
    </Page>
  )
}

export default CoachHomePage
