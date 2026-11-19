import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoachAvatar } from '@/app/components/CoachAvatar'
import { Notice } from '@/app/components/ui/Notice'
import { Page } from '@/app/components/ui/Page'
import { PlanCheckoutForm } from '@/app/features/apply/components/PlanCheckoutForm'
import { PromoCodeForm } from '@/app/features/apply/components/PromoCodeForm'
import { WaitlistForm } from '@/app/features/apply/components/WaitlistForm'
import { CoachAvailabilityNotice } from '@/app/features/coach-availability/components/CoachAvailabilityNotice'
import {
  pausedMessage,
  signupAckLabel,
} from '@/app/features/coach-availability/utils/availabilityText'
import { previewMonitorCode } from '@/server/features/monitor/presentation/queries'
import { getApplyPage } from '@/server/features/purchase/presentation/queries'
import { getTurnstileSiteKey } from '@/server/utils/turnstile'

export const metadata: Metadata = { title: '申し込み' }

type Props = {
  params: Promise<{ coachSlug: string }>
  searchParams: Promise<{ code?: string }>
}

/** 申し込み：プランを選ぶ（プロモーションコードがあれば、モニターの1レッスン）。お試し・1レッスンは、このあとスレッドの画面で悩みと動画を送り、カードを登録する（月額はすぐ支払う） */
const ApplyPage = async ({ params, searchParams }: Props) => {
  const { coachSlug } = await params
  const { code: rawCode } = await searchParams
  const code = rawCode?.trim() ? rawCode.trim().toUpperCase() : null
  const [page, preview] = await Promise.all([
    getApplyPage(coachSlug),
    code ? previewMonitorCode(coachSlug, code) : null,
  ])
  if (!page?.coach.acceptingApplications) notFound()
  const { coach, isFull, student } = page
  const monitor = preview?.ok && code ? { code, priceYen: preview.value.priceYen } : null
  const promo = (
    <PromoCodeForm
      code={code}
      error={preview && !preview.ok ? preview.error : null}
      applied={monitor !== null}
      basePath={`/c/${coach.slug}/apply`}
    />
  )

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
        <div className="space-y-4">
          {/* 使っているコードは上に出す。入れる入口は、知らない人の邪魔にならないよう下に控えめに置く */}
          {monitor && promo}
          <PlanCheckoutForm
            coachSlug={coach.slug}
            plans={coach.plans}
            student={student}
            monitor={monitor}
            turnstileSiteKey={getTurnstileSiteKey()}
            delayAckLabel={
              coach.signupGuard === 'ack_required'
                ? signupAckLabel(
                    coach.availability.kind === 'absent' ? coach.availability.resumeDate : null
                  )
                : null
            }
          />
          {!monitor && promo}
        </div>
      )}
    </Page>
  )
}

export default ApplyPage
