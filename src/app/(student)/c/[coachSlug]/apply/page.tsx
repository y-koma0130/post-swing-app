import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlanCheckoutForm } from '@/app/features/apply/components/PlanCheckoutForm'
import { WaitlistForm } from '@/app/features/apply/components/WaitlistForm'
import { getApplyPage } from '@/server/features/purchase/presentation/queries'

export const metadata: Metadata = { title: '申し込み' }

type Props = {
  params: Promise<{ coachSlug: string }>
}

/** 申し込み：プランを選んで支払う。動画は支払いのあと、スレッドの画面から送る */
const ApplyPage = async ({ params }: Props) => {
  const { coachSlug } = await params
  const page = await getApplyPage(coachSlug)
  if (!page?.coach.acceptingApplications) notFound()
  const { coach, isFull, student } = page

  return (
    <main className="space-y-6 px-6 py-10">
      <div>
        <p className="text-sm text-gray-500">{coach.name} さんの添削</p>
        <h1 className="mt-1 text-xl font-bold">申し込み</h1>
      </div>
      {isFull ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            今月は満枠です。空きが出たら LINE でお知らせします。
          </p>
          {student ? (
            <WaitlistForm coachSlug={coach.slug} onWaitlist={student.onWaitlist} />
          ) : (
            <WaitlistForm coachSlug={coach.slug} onWaitlist={false} />
          )}
        </div>
      ) : (
        <PlanCheckoutForm coachSlug={coach.slug} plans={coach.plans} student={student} />
      )}
    </main>
  )
}

export default ApplyPage
