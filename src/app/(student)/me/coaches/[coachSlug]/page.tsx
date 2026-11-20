import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { CoachAvatar } from '@/app/components/CoachAvatar'
import { ButtonLink } from '@/app/components/ui/Button'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { MyPurchaseList } from '@/app/features/apply/components/MyPurchaseList'
import { CoachAvailabilityNotice } from '@/app/features/coach-availability/components/CoachAvailabilityNotice'
import { CoachLicenses } from '@/app/features/coach-profile/components/CoachLicenses'
import { ShareConsentForm } from '@/app/features/share/components/ShareConsentForm'
import { StudentLessonSections } from '@/app/features/thread/components/StudentLessonSections'
import { parseShownCount, showMoreHref } from '@/app/utils/listPaging'
import { getActor } from '@/server/auth/getActor'
import { getCoachProfile } from '@/server/features/coach/presentation/queries'
import { getMyPurchases } from '@/server/features/purchase/presentation/queries'
import { getMyShareConsent } from '@/server/features/share/presentation/queries'
import { getMyThreadSummaries } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: 'コーチ' }

type Props = {
  params: Promise<{ coachSlug: string }>
  searchParams: Promise<{ finished?: string }>
}

/**
 * 生徒から見たコーチの詳細（マイページの「あなたのコーチ」から開く）。
 * このコーチとのスレッドと申し込み、もう一度申し込むための受付ページへの入口
 */
const MyCoachPage = async ({ params, searchParams }: Props) => {
  const { coachSlug } = await params
  const finishedShown = parseShownCount((await searchParams).finished)
  if (!(await getActor())) {
    redirect(`/login?next=${encodeURIComponent(`/me/coaches/${coachSlug}`)}`)
  }
  const [coach, purchases, lessons, share] = await Promise.all([
    getCoachProfile(coachSlug),
    getMyPurchases(),
    getMyThreadSummaries({ finishedLimit: finishedShown, coachSlug }),
    getMyShareConsent(coachSlug),
  ])
  if (!coach || !purchases || !lessons) notFound()
  const myPurchases = purchases.filter((p) => p.coachSlug === coach.slug)
  // 申し込んだことのないコーチは、受付ページで見てもらう
  if (myPurchases.length === 0 && lessons.active.length === 0 && lessons.finishedTotal === 0) {
    redirect(`/c/${coach.slug}`)
  }

  return (
    <Page layout="student">
      <PageHeader back={{ href: '/me', label: 'マイページ' }} title="コーチ" />
      <section className="flex items-center gap-4">
        <CoachAvatar name={coach.name} url={coach.avatarUrl} size={64} />
        <div className="min-w-0 space-y-0.5">
          <p className="text-caption text-muted">{coach.title}</p>
          <p className="text-title">{coach.name}</p>
          {coach.instagram && <p className="text-caption text-muted">{coach.instagram}</p>}
          <CoachLicenses licenses={coach.licenses} licenseOther={coach.licenseOther} />
        </div>
      </section>
      {coach.bio && (
        <p className="text-body text-sm leading-relaxed whitespace-pre-wrap">{coach.bio}</p>
      )}
      <CoachAvailabilityNotice
        coachName={coach.name}
        availability={coach.availability}
        upcomingAbsence={coach.upcomingAbsence}
      />

      <StudentLessonSections
        lessons={lessons}
        now={new Date()}
        moreHref={showMoreHref(`/me/coaches/${coach.slug}`, finishedShown)}
        showCounterpart={false}
      />

      {myPurchases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-heading">購入したプラン</h2>
          <MyPurchaseList purchases={myPurchases} showCoach={false} />
        </section>
      )}

      {share && (
        <section className="space-y-3">
          <h2 className="text-heading">SNS での紹介</h2>
          <ShareConsentForm
            coachSlug={coach.slug}
            coachName={coach.name}
            consent={share.consent}
            canPublish={share.canPublish}
            locked={share.locked}
          />
        </section>
      )}

      <section className="space-y-2">
        <ButtonLink href={`/c/${coach.slug}`} variant="secondary" className="w-full">
          もう一度申し込む（受付ページへ）
        </ButtonLink>
      </section>
    </Page>
  )
}

export default MyCoachPage
