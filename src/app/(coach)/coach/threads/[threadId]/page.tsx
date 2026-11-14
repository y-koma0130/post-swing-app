import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
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
          {thread.status === 'closed' && '・終了'}
        </p>
      </header>
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
