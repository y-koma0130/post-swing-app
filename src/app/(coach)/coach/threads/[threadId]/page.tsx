import { notFound } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { getThreadDetail } from '@/server/features/thread/presentation/queries'
import { ReviewWorkspace } from './_components/ReviewWorkspace'

type Props = {
  params: Promise<{ threadId: string }>
}

/** MOC では生徒の動画がないので、コマ数が数えられるテスト動画を最初に出しておく */
const SAMPLE_VIDEO_SRC = '/samples/frame-counter-60fps.mp4'

/** 添削画面。TODO: キー位置・添削カード・チャットを組み込む */
const ReviewPage = async ({ params }: Props) => {
  const { threadId } = await params
  const thread = await getThreadDetail(threadId)
  if (!thread) notFound()

  const latestVideo = thread.videos.at(-1)

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-bold">
        {thread.studentName}：{thread.theme}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ReviewWorkspace
          defaultSrc={SAMPLE_VIDEO_SRC}
          defaultLabel="テスト動画（60fps・コマ数の確認用）"
        />

        <aside className="space-y-4">
          {latestVideo && (
            <Card>
              <p className="text-xs text-gray-500">生徒のメモ</p>
              <p className="mt-1 text-sm">{latestVideo.note}</p>
            </Card>
          )}
          <Card>
            <p className="text-sm text-gray-500">キー位置・添削カード（実装予定）</p>
          </Card>
        </aside>
      </div>
    </main>
  )
}

export default ReviewPage
