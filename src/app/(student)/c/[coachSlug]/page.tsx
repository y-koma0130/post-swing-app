import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/app/components/ui/Badge'
import { ButtonLink } from '@/app/components/ui/Button'
import { Page } from '@/app/components/ui/Page'
import { CoachAvailabilityNotice } from '@/app/features/coach-availability/components/CoachAvailabilityNotice'
import { pausedMessage } from '@/app/features/coach-availability/utils/availabilityText'
import { CoachAvatar } from '@/app/features/coach-profile/components/CoachAvatar'
import { HowItWorks } from '@/app/features/coach-profile/components/HowItWorks'
import { PlanList } from '@/app/features/coach-profile/components/PlanList'
import {
  coachShareDescription,
  coachShareTitle,
} from '@/app/features/coach-profile/utils/coachShareText'
import { ReviewSummary } from '@/app/features/coach-review/components/ReviewSummary'
import { getCoachProfile, getCurrentCoach } from '@/server/features/coach/presentation/queries'
import { getCoachReviewSummary } from '@/server/features/coach-review/presentation/queries'
import { getSiteUrl } from '@/server/utils/siteUrl'

type Props = {
  params: Promise<{ coachSlug: string }>
}

/**
 * インスタのプロフィールやストーリーにリンクを貼ったときのカード。
 * 画像は同じフォルダの opengraph-image.tsx が作る
 */
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { coachSlug } = await params
  const coach = await getCoachProfile(coachSlug)
  if (!coach) return {}
  const title = coachShareTitle(coach)
  const description = coachShareDescription(coach)
  return {
    // opengraph-image の URL は、ページ側の metadataBase で絶対 URL になる（vinext はレイアウトの値を引き継がない）
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: { canonical: `/c/${coach.slug}` },
    openGraph: { type: 'profile', title, description, url: `/c/${coach.slug}` },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/** 受付ページ */
const CoachLandingPage = async ({ params }: Props) => {
  const { coachSlug } = await params
  const [coach, reviews, viewer] = await Promise.all([
    getCoachProfile(coachSlug),
    getCoachReviewSummary(coachSlug),
    getCurrentCoach(),
  ])
  if (!coach) notFound()
  // コーチが自分の受付ページを見ている（生徒からの見え方の確認）
  const ownPage = viewer.kind === 'coach' && viewer.settings.slug === coach.slug

  const closedMessage =
    coach.signupGuard === 'paused'
      ? coach.availability.kind === 'absent'
        ? pausedMessage(coach.availability.resumeDate)
        : 'ただいま申し込みを止めています'
      : coach.acceptingApplications
        ? null
        : 'ただいま申し込みの準備中です'

  return (
    <Page layout="student">
      {ownPage && (
        <div className="bg-mint-soft space-y-2 rounded-xl p-4 text-sm">
          <p className="text-ink font-bold">あなたの受付ページです</p>
          <p className="text-body">
            生徒にはこのように見えます。プロフィールやプランは設定から変えられます。
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/coach" className="text-ink font-bold">
              ← コーチ画面に戻る
            </Link>
            <Link href="/coach/settings" className="text-ink underline">
              設定を開く
            </Link>
          </div>
        </div>
      )}
      <header className="flex items-center gap-4">
        <CoachAvatar name={coach.name} url={coach.avatarUrl} size={72} />
        <div className="min-w-0 space-y-0.5">
          <p className="text-caption text-muted">{coach.title}</p>
          <h1 className="text-title">{coach.name}</h1>
          {coach.instagram && <p className="text-caption text-muted">{coach.instagram}</p>}
        </div>
      </header>
      <p className="text-body leading-relaxed whitespace-pre-wrap">{coach.bio}</p>
      <section aria-label="受付の状況" className="space-y-3">
        <Badge tone={coach.remainingCapacity > 0 ? 'mint' : 'neutral'}>
          {coach.remainingCapacity > 0
            ? `今月の受付 残り${coach.remainingCapacity}枠`
            : '今月は満枠です（キャンセル待ち受付中）'}
        </Badge>
        <CoachAvailabilityNotice
          coachName={coach.name}
          availability={coach.availability}
          upcomingAbsence={coach.upcomingAbsence}
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-heading">プラン</h2>
        <PlanList plans={coach.plans} />
      </section>
      <HowItWorks />
      <ReviewSummary summary={reviews} />
      {ownPage ? (
        <p className="bg-surface text-muted rounded-xl p-4 text-center text-sm">
          生徒はここの「動画を送って添削してもらう」から申し込みます（あなた自身は申し込めません）
        </p>
      ) : closedMessage ? (
        <p className="bg-surface text-muted rounded-xl p-4 text-center text-sm">{closedMessage}</p>
      ) : (
        // スクロールしても申し込みボタンが画面の下に残る
        <div className="border-line-soft sticky bottom-0 -mx-6 border-t bg-white/90 px-6 py-3 backdrop-blur">
          <ButtonLink href={`/c/${coach.slug}/apply`} size="lg" className="w-full">
            動画を送って添削してもらう
          </ButtonLink>
        </div>
      )}
    </Page>
  )
}

export default CoachLandingPage
