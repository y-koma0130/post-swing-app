import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { CoachAvatar } from '@/app/components/CoachAvatar'
import { ButtonLink } from '@/app/components/ui/Button'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { MyPurchaseList } from '@/app/features/apply/components/MyPurchaseList'
import { CoachAvailabilityNotice } from '@/app/features/coach-availability/components/CoachAvailabilityNotice'
import { CoachLicenses } from '@/app/features/coach-profile/components/CoachLicenses'
import { ShareConsentForm } from '@/app/features/share/components/ShareConsentForm'
import { ThreadList } from '@/app/features/thread/components/ThreadList'
import { getActor } from '@/server/auth/getActor'
import { getCoachProfile } from '@/server/features/coach/presentation/queries'
import { getMyPurchases } from '@/server/features/purchase/presentation/queries'
import { getMyShareConsent } from '@/server/features/share/presentation/queries'
import { getMyThreadSummaries } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: 'コーチ' }

type Props = {
  params: Promise<{ coachSlug: string }>
}

/**
 * 生徒から見たコーチの詳細（マイページの「あなたのコーチ」から開く）。
 * このコーチとのスレッドと申し込み、もう一度申し込むための受付ページへの入口
 */
const MyCoachPage = async ({ params }: Props) => {
  const { coachSlug } = await params
  if (!(await getActor())) {
    redirect(`/login?next=${encodeURIComponent(`/me/coaches/${coachSlug}`)}`)
  }
  const [coach, purchases, threads, share] = await Promise.all([
    getCoachProfile(coachSlug),
    getMyPurchases(),
    getMyThreadSummaries(),
    getMyShareConsent(coachSlug),
  ])
  if (!coach || !purchases || !threads) notFound()
  const myPurchases = purchases.filter((p) => p.coachSlug === coach.slug)
  const myThreads = threads.filter((t) => t.coachSlug === coach.slug)
  // 申し込んだことのないコーチは、受付ページで見てもらう
  if (myPurchases.length === 0 && myThreads.length === 0) redirect(`/c/${coach.slug}`)

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

      <section className="space-y-3">
        <h2 className="text-heading">添削のやりとり</h2>
        {myThreads.length === 0 ? (
          <p className="text-muted text-sm">レッスンの準備ができると、ここに表示されます。</p>
        ) : (
          <ThreadList threads={myThreads} viewer="student" showCounterpart={false} />
        )}
      </section>

      {myPurchases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-heading">購入したプラン</h2>
          <MyPurchaseList purchases={myPurchases} showCoach={false} />
        </section>
      )}

      {share && (
        <section className="space-y-3">
          <h2 className="text-heading">添削の公開</h2>
          <ShareConsentForm
            coachSlug={coach.slug}
            coachName={coach.name}
            consent={share.consent}
            canPublish={share.canPublish}
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
