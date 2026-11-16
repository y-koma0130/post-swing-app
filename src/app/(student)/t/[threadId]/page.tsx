import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { ChatPanel } from '@/app/features/chat/components/ChatPanel'
import { CoachReviewForm } from '@/app/features/coach-review/components/CoachReviewForm'
import { ReviewCardList } from '@/app/features/review-card/components/ReviewCardList'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import { VideoUploadForm } from '@/app/features/video-upload/components/VideoUploadForm'
import { formatMonthDay } from '@/app/utils/format'
import { getActor } from '@/server/auth/getActor'
import type { VideoSubmissionBlocker } from '@/server/features/thread/domain/services/checkVideoSubmission.service'
import { getStudentThread } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: 'スレッド' }

type Props = {
  params: Promise<{ threadId: string }>
}

const BLOCKER_MESSAGE = {
  awaiting_reply: 'コーチの添削を待っています。届いたら LINE でお知らせします。',
  video_limit: 'このスレッドで送れる動画は、すべて送りました。',
  expired: 'このスレッドは期限が切れました。',
  closed: 'このスレッドは終了しました。',
} as const satisfies Record<VideoSubmissionBlocker, string>

/** 生徒の閲覧ページ：動画を送り、添削カードを見る */
const ThreadViewPage = async ({ params }: Props) => {
  const { threadId } = await params
  if (!(await getActor())) redirect(`/login?next=${encodeURIComponent(`/t/${threadId}`)}`)
  const thread = await getStudentThread(threadId)
  if (!thread) notFound()

  return (
    <main className="space-y-8 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm text-gray-500">{thread.coachName} さんの添削</p>
        <h1 className="text-xl font-bold">
          {thread.theme === '' ? '動画を送りましょう' : thread.theme}
        </h1>
        <p className="text-xs text-gray-500">
          動画 {thread.videos.length}/{thread.maxVideos}本・期限 {formatMonthDay(thread.expiresAt)}
        </p>
      </header>

      {thread.videos.map((video, index) => (
        <section key={video.id} className="space-y-4">
          <h2 className="font-bold">{index + 1}本目</h2>
          <VideoPlayer src={video.url} frameRate={video.frameRate} />
          {video.note && <p className="text-sm whitespace-pre-wrap text-gray-600">{video.note}</p>}
          {video.reply ? (
            <ReviewCardList cards={video.reply.cards} />
          ) : (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">添削を待っています。</p>
          )}
          <div className="space-y-2">
            <h3 className="text-sm font-bold">コーチとのチャット</h3>
            <ChatPanel
              threadId={thread.id}
              video={video}
              viewer="student"
              closed={thread.status === 'closed'}
            />
          </div>
        </section>
      ))}

      {thread.status === 'closed' && (
        <section className="space-y-3">
          <h2 className="font-bold">{thread.coachName} さんのレビュー</h2>
          {thread.review ? (
            <p className="text-sm text-gray-600">
              ★{thread.review.rating} を送りました。ありがとうございました。
            </p>
          ) : (
            <Card>
              <CoachReviewForm threadId={thread.id} />
            </Card>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-bold">
          {thread.videos.length === 0 ? '動画を送る' : '撮り直して送る'}
        </h2>
        {thread.videoSubmissionBlocker === null ? (
          <Card>
            <VideoUploadForm
              threadId={thread.id}
              needsTheme={thread.videos.length === 0}
              maxBytes={thread.maxVideoBytes}
            />
          </Card>
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            {BLOCKER_MESSAGE[thread.videoSubmissionBlocker]}
          </p>
        )}
      </section>
    </main>
  )
}

export default ThreadViewPage
