import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { formatMonthDay } from '@/app/utils/format'
import { getActor } from '@/server/auth/getActor'
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
  const thread = await getCoachThread(threadId)
  if (!thread) notFound()

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">
          {thread.studentName}：{thread.theme === '' ? '（動画待ち）' : thread.theme}
        </h1>
        <p className="text-sm text-gray-500">
          動画 {thread.videos.length}/{thread.maxVideos}本・期限 {formatMonthDay(thread.expiresAt)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ReviewWorkspace
          videos={thread.videos.map((v) => ({ id: v.id, url: v.url, note: v.note }))}
        />
        <aside className="space-y-4">
          <Card>
            <p className="text-sm text-gray-500">キー位置・添削カード・チャット（M5で実装）</p>
          </Card>
        </aside>
      </div>
    </main>
  )
}

export default ReviewPage
