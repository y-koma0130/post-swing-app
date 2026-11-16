import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { extensionNote } from '@/app/features/coach-availability/utils/availabilityText'
import { CoachReviewReplyForm } from '@/app/features/coach-review/components/CoachReviewReplyForm'
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
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">
          {thread.studentName}：{thread.theme === '' ? '（動画待ち）' : thread.theme}
        </h1>
        <p className="text-sm text-gray-500">
          動画 {thread.videos.length}/{thread.maxVideos}本・期限 {formatMonthDay(thread.expiresAt)}
          {extensionNote(thread.extendedDays)}
          {thread.status === 'closed' && '・終了'}
        </p>
      </header>
      {thread.review && (
        <Card className="space-y-2">
          <p className="font-bold">
            レビュー <span className="text-mint">{'★'.repeat(thread.review.rating)}</span>
          </p>
          {thread.review.comment && (
            <p className="text-sm whitespace-pre-wrap text-gray-700">{thread.review.comment}</p>
          )}
          {thread.review.coachReply ? (
            <p className="text-sm text-gray-500">返信：{thread.review.coachReply}</p>
          ) : (
            <CoachReviewReplyForm threadId={thread.id} />
          )}
        </Card>
      )}
      <ReviewWorkspace
        threadId={thread.id}
        closed={thread.status === 'closed'}
        videos={thread.videos}
        drills={drills}
      />
    </main>
  )
}

export default ReviewPage
