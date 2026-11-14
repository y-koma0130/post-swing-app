import { notFound } from 'next/navigation'
import { getThreadDetail } from '@/server/features/thread/presentation/queries'

type Props = {
  params: Promise<{ threadId: string }>
}

/** 添削画面。TODO: 動画プレイヤー・線引き・添削カード・チャットを組み込む */
const ReviewPage = async ({ params }: Props) => {
  const { threadId } = await params
  const thread = await getThreadDetail(threadId)
  if (!thread) notFound()

  return (
    <main>
      <h1 className="text-xl font-bold">
        {thread.studentName}：{thread.theme}
      </h1>
      <p className="mt-4 text-sm text-gray-500">動画プレイヤー・線引き・添削カード（実装予定）</p>
    </main>
  )
}

export default ReviewPage
