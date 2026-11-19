import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { QuoteProvider } from '@/app/features/chat/components/QuoteContext'
import { extensionNote } from '@/app/features/coach-availability/utils/availabilityText'
import { CoachReviewReplyForm } from '@/app/features/coach-review/components/CoachReviewReplyForm'
import { ApplicationDecision } from '@/app/features/thread/components/ApplicationDecision'
import { MarkThreadRead } from '@/app/features/thread/components/MarkThreadRead'
import { latestTimelineAt } from '@/app/features/thread/utils/buildTimeline'
import {
  DECLINE_REASON_LABEL,
  golfProfileText,
  threadUsageText,
} from '@/app/features/thread/utils/threadText'
import { formatMonthDay } from '@/app/utils/format'
import { getActor } from '@/server/auth/getActor'
import { getMyDrills } from '@/server/features/drill/presentation/queries'
import { getCoachThread } from '@/server/features/thread/presentation/queries'
import { CoachThreadView } from './_components/CoachThreadView'

export const metadata: Metadata = { title: '添削' }

type Props = {
  params: Promise<{ threadId: string }>
}

/** 添削画面 */
const ReviewPage = async ({ params }: Props) => {
  const { threadId } = await params
  if (!(await getActor())) redirect('/coach/login')
  const [thread, drills] = await Promise.all([getCoachThread(threadId), getMyDrills()])
  if (!thread) notFound()
  const golf = golfProfileText(thread.golfProfile)

  return (
    <Page layout="list">
      <PageHeader
        back={{ href: '/coach', label: 'ホーム' }}
        eyebrow={thread.studentName || '（名前なし）'}
        title={thread.theme === '' ? '（動画待ち）' : thread.theme}
        description={
          thread.status === 'requested' ? (
            '申し込み（承認待ち）'
          ) : thread.status === 'declined' ? (
            'お断りした申し込み'
          ) : (
            <>
              {threadUsageText({
                submissionCount: thread.submissions.length,
                maxSubmissions: thread.limits.maxSubmissions,
              })}
              ・生徒のチャット 残り{thread.remainingStudentMessages}通・期限{' '}
              {formatMonthDay(thread.expiresAt)}
              {extensionNote(thread.extendedDays)}
              {thread.status === 'closed' && '・終了'}
            </>
          )
        }
      />
      {/* 申し込みのときに生徒が任意で書いたもの（添削の参考） */}
      {golf && <p className="text-caption text-muted -mt-2">生徒のゴルフ：{golf}</p>}
      {thread.status === 'requested' && (
        <ApplicationDecision
          threadId={thread.id}
          studentName={thread.studentName}
          deadline={thread.application.approvalDeadline}
        />
      )}
      {thread.application.decline && (
        <p className="bg-surface text-muted rounded-xl p-4 text-sm">
          お断りしました：{DECLINE_REASON_LABEL[thread.application.decline.reason]}
          {thread.application.decline.message && `（${thread.application.decline.message}）`}
          。生徒には請求されていません。
        </p>
      )}
      {thread.review && (
        <Card className="space-y-2">
          <p className="font-bold">
            レビュー <span className="text-mint">{'★'.repeat(thread.review.rating)}</span>
          </p>
          {thread.review.comment && (
            <p className="text-body text-sm whitespace-pre-wrap">{thread.review.comment}</p>
          )}
          {thread.review.coachReply ? (
            <p className="text-muted text-sm">返信：{thread.review.coachReply}</p>
          ) : (
            <CoachReviewReplyForm threadId={thread.id} />
          )}
        </Card>
      )}
      <MarkThreadRead threadId={thread.id} latestAt={latestTimelineAt(thread)} />
      <QuoteProvider>
        <CoachThreadView thread={thread} drills={drills} />
      </QuoteProvider>
    </Page>
  )
}

export default ReviewPage
