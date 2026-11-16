import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { QuoteProvider } from '@/app/features/chat/components/QuoteContext'
import { extensionNote } from '@/app/features/coach-availability/utils/availabilityText'
import { CoachReviewReplyForm } from '@/app/features/coach-review/components/CoachReviewReplyForm'
import { threadUsageText } from '@/app/features/thread/utils/threadText'
import { formatMonthDay } from '@/app/utils/format'
import { getActor } from '@/server/auth/getActor'
import { getMyDrills } from '@/server/features/drill/presentation/queries'
import { getCoachThread } from '@/server/features/thread/presentation/queries'
import { ReviewWorkspace } from './_components/ReviewWorkspace'

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

  return (
    <Page layout="wide">
      <PageHeader
        back={{ href: '/coach', label: 'ホーム' }}
        eyebrow={thread.studentName || '（名前なし）'}
        title={thread.theme === '' ? '（動画待ち）' : thread.theme}
        description={
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
        }
      />
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
      <QuoteProvider>
        <ReviewWorkspace
          threadId={thread.id}
          closed={thread.status === 'closed'}
          submissions={thread.submissions}
          messages={thread.messages}
          notices={thread.notices}
          drills={drills}
          limits={thread.limits}
        />
      </QuoteProvider>
    </Page>
  )
}

export default ReviewPage
