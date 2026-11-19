import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Notice } from '@/app/components/ui/Notice'
import { Page } from '@/app/components/ui/Page'
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

/** 申し込み：プランを選ぶ。お試し・1スレッドは、このあとスレッドの画面で悩みと動画を送り、カードを登録する（月額はすぐ支払う） */
const ApplyPage = async ({ params }: Props) => {
  const { coachSlug } = await params
  const page = await getApplyPage(coachSlug)
  if (!page?.coach.acceptingApplications) notFound()
  const { coach, isFull, student } = page

  return (
    <Page layout="student">
      <div className="flex items-center gap-3">
        <CoachAvatar name={coach.name} url={coach.avatarUrl} size={48} />
        <div>
          <p className="text-muted text-sm">{coach.name} さんの添削</p>
          <h1 className="text-title mt-1">申し込み</h1>
        </div>
      </div>
      <CoachAvailabilityNotice
        coachName={coach.name}
        availability={coach.availability}
        upcomingAbsence={coach.upcomingAbsence}
      />
      {coach.signupGuard === 'paused' ? (
        <Notice className="text-center">
          <p>
            {coach.availability.kind === 'absent'
              ? pausedMessage(coach.availability.resumeDate)
              : 'ただいま申し込みを止めています'}
          </p>
        </Notice>
      ) : isFull ? (
        <div className="space-y-4">
          <p className="text-body text-sm">今月は満枠です。空きが出たら LINE でお知らせします。</p>
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
    </Page>
  )
}

export default ApplyPage
