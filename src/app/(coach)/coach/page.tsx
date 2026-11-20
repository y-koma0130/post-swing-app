import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ButtonLink } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { inlineLinkClass } from '@/app/components/ui/linkStyles'
import { Notice } from '@/app/components/ui/Notice'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { AvailabilityBanner } from '@/app/features/coach-availability/components/AvailabilityBanner'
import { CoachThreadSections } from '@/app/features/thread/components/CoachThreadSections'
import { parseShownCount, showMoreHref } from '@/app/utils/listPaging'
import {
  getCurrentCoach,
  getCurrentCoachAvailabilitySettings,
} from '@/server/features/coach/presentation/queries'
import { getCurrentDemoExpiry } from '@/server/features/demo/presentation/queries'
import { getCoachThreadSummaries } from '@/server/features/thread/presentation/queries'

/** コーチのホーム */
type Props = {
  searchParams: Promise<{ finished?: string }>
}

const CoachHomePage = async ({ searchParams }: Props) => {
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
  const finishedShown = parseShownCount((await searchParams).finished)
  const [lessons, availability, demoExpiry] = await Promise.all([
    getCoachThreadSummaries(actor.userId, finishedShown),
    getCurrentCoachAvailabilitySettings(),
    getCurrentDemoExpiry(),
  ])

  return (
    <Page layout="list">
      {availability && <AvailabilityBanner availability={availability.availability} />}
      {/* デモは口座を登録できない（お支払いも行わない）ので、口座の案内は出さない */}
      {!settings.chargesEnabled && demoExpiry === null && (
        <Notice tone="warning" emphasis title="まだ申し込みを受け付けていません">
          <p>
            売上を受け取る口座を設定すると、受付ページから申し込めるようになります。
            <Link href="/coach/settings" className={`ml-1 ${inlineLinkClass}`}>
              設定へ
            </Link>
          </p>
        </Notice>
      )}
      <PageHeader
        title="レッスン"
        actions={
          <ButtonLink href={`/c/${settings.slug}`} variant="secondary" size="sm">
            受付ページを見る
          </ButtonLink>
        }
      />
      {lessons.active.length === 0 && lessons.finishedTotal === 0 ? (
        <EmptyState
          title="まだレッスンはありません"
          description="受付ページのリンクを、インスタのプロフィールやストーリーで生徒に案内しましょう。申し込みがあると、ここに並びます。"
          action={
            <ButtonLink href={`/c/${settings.slug}`} variant="secondary" size="sm">
              受付ページを見る
            </ButtonLink>
          }
        />
      ) : (
        <CoachThreadSections
          lessons={lessons}
          now={new Date()}
          moreHref={showMoreHref('/coach', finishedShown)}
        />
      )}
    </Page>
  )
}

export default CoachHomePage
