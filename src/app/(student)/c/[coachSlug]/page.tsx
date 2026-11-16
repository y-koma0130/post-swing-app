import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ButtonLink } from '@/app/components/ui/Button'
import { CoachAvailabilityNotice } from '@/app/features/coach-availability/components/CoachAvailabilityNotice'
import { pausedMessage } from '@/app/features/coach-availability/utils/availabilityText'
import { PlanList } from '@/app/features/coach-profile/components/PlanList'
import {
  coachShareDescription,
  coachShareTitle,
} from '@/app/features/coach-profile/utils/coachShareText'
import { ReviewSummary } from '@/app/features/coach-review/components/ReviewSummary'
import { getCoachProfile } from '@/server/features/coach/presentation/queries'
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
  const [coach, reviews] = await Promise.all([
    getCoachProfile(coachSlug),
    getCoachReviewSummary(coachSlug),
  ])
  if (!coach) notFound()

  return (
    <main className="px-6 py-10">
      <p className="text-sm text-gray-500">{coach.title}</p>
      <h1 className="mt-1 text-2xl font-bold">{coach.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{coach.instagram}</p>
      <p className="mt-6 leading-relaxed text-gray-700">{coach.bio}</p>
      <p className="bg-mint-soft text-ink mt-6 inline-block rounded-full px-4 py-1 text-sm font-bold">
        {coach.remainingCapacity > 0
          ? `今月の受付 残り${coach.remainingCapacity}枠`
          : '今月は満枠です（キャンセル待ち受付中）'}
      </p>
      <div className="mt-6">
        <CoachAvailabilityNotice
          coachName={coach.name}
          availability={coach.availability}
          upcomingAbsence={coach.upcomingAbsence}
        />
      </div>
      <div className="mt-8">
        <PlanList plans={coach.plans} />
      </div>
      <div className="mt-10">
        <ReviewSummary summary={reviews} />
      </div>
      {coach.acceptingApplications && coach.signupGuard === 'paused' ? (
        <p className="mt-8 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">
          {coach.availability.kind === 'absent'
            ? pausedMessage(coach.availability.resumeDate)
            : 'ただいま申し込みを止めています'}
        </p>
      ) : coach.acceptingApplications ? (
        <ButtonLink href={`/c/${coach.slug}/apply`} className="mt-8 w-full">
          動画を送って添削してもらう
        </ButtonLink>
      ) : (
        <p className="mt-8 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">
          ただいま申し込みの準備中です
        </p>
      )}
    </main>
  )
}

export default CoachLandingPage
