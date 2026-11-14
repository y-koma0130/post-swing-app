import { notFound } from 'next/navigation'
import { getThreadDetail } from '@/server/features/thread/presentation/queries'

type Props = {
  params: Promise<{ threadId: string }>
}

/** 閲覧ページ。TODO: 添削カード・チャットを組み込む */
const ThreadViewPage = async ({ params }: Props) => {
  const { threadId } = await params
  const thread = await getThreadDetail(threadId)
  if (!thread) notFound()

  return (
    <main className="px-6 py-10">
      <p className="text-sm text-gray-500">テーマ</p>
      <h1 className="text-xl font-bold">{thread.theme}</h1>
      <p className="mt-4 text-sm text-gray-500">添削カード・チャット（実装予定）</p>
    </main>
  )
}

export default ThreadViewPage
