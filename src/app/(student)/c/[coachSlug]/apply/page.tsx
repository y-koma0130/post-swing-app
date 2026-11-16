import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlanCheckoutForm } from '@/app/features/apply/components/PlanCheckoutForm'
import { WaitlistForm } from '@/app/features/apply/components/WaitlistForm'
import { CoachAvailabilityNotice } from '@/app/features/coach-availability/components/CoachAvailabilityNotice'
import {
  pausedMessage,
  signupAckLabel,
} from '@/app/features/coach-availability/utils/availabilityText'
import { CoachAvatar } from '@/app/features/coach-profile/components/CoachAvatar'
import { getApplyPage } from '@/server/features/purchase/presentation/queries'
import { getTurnstileSiteKey } from '@/server/utils/turnstile'

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
      <div className="flex items-center gap-3">
        <CoachAvatar name={coach.name} url={coach.avatarUrl} size={48} />
        <div>
          <p className="text-sm text-gray-500">{coach.name} さんの添削</p>
          <h1 className="mt-1 text-xl font-bold">申し込み</h1>
        </div>
      </div>
      <CoachAvailabilityNotice
        coachName={coach.name}
        availability={coach.availability}
        upcomingAbsence={coach.upcomingAbsence}
      />
      {coach.signupGuard === 'paused' ? (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">
          {coach.availability.kind === 'absent'
            ? pausedMessage(coach.availability.resumeDate)
            : 'ただいま申し込みを止めています'}
        </p>
      ) : isFull ? (
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
        <PlanCheckoutForm
          coachSlug={coach.slug}
          plans={coach.plans}
          student={student}
          turnstileSiteKey={getTurnstileSiteKey()}
          delayAckLabel={
            coach.signupGuard === 'ack_required'
              ? signupAckLabel(
                  coach.availability.kind === 'absent' ? coach.availability.resumeDate : null
                )
              : null
          }
        />
      )}
    </main>
  )
}

export default ApplyPage
