import { notFound } from 'next/navigation'
import { ButtonLink } from '@/app/components/ui/Button'
import { PlanList } from '@/app/features/coach-profile/components/PlanList'
import { getCoachProfile } from '@/server/features/coach/presentation/queries'

type Props = {
  params: Promise<{ coachSlug: string }>
}

/** 受付ページ */
const CoachLandingPage = async ({ params }: Props) => {
  const { coachSlug } = await params
  const coach = await getCoachProfile(coachSlug)
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
      <div className="mt-8">
        <PlanList plans={coach.plans} />
      </div>
      {coach.acceptingApplications ? (
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
