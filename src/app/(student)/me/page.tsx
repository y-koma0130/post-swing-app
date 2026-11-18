import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { MyPurchaseList } from '@/app/features/apply/components/MyPurchaseList'
import { MyCoachLinks } from '@/app/features/coach-profile/components/MyCoachLinks'
import { uniqueCoaches } from '@/app/features/coach-profile/utils/uniqueCoaches'
import { LineFriendPrompt } from '@/app/features/notification/components/LineFriendPrompt'
import { ThreadList } from '@/app/features/thread/components/ThreadList'
import { getLineFriendPrompt } from '@/server/features/notification/presentation/queries'
import { getMyPurchases } from '@/server/features/purchase/presentation/queries'
import { getMyThreadSummaries } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: 'マイページ' }

type Props = {
  searchParams: Promise<{ checkout?: string }>
}

/** 生徒のマイページ */
const MyPage = async ({ searchParams }: Props) => {
  const [purchases, threads, linePrompt] = await Promise.all([
    getMyPurchases(),
    getMyThreadSummaries(),
    getLineFriendPrompt(),
  ])
  if (!purchases || !threads) redirect('/login?next=/me')
  const { checkout } = await searchParams

  return (
    <Page layout="student">
      <PageHeader title="マイページ" />
      {linePrompt && <LineFriendPrompt addFriendUrl={linePrompt.addFriendUrl} />}
      {checkout === 'success' && (
        <p className="bg-mint-soft text-ink rounded-xl p-4 text-sm">
          お支払いが完了しました。スレッドの準備ができたら、ここから動画を送れます。
        </p>
      )}
      {purchases.length === 0 && threads.length === 0 ? (
        <EmptyState
          title="まだ申し込みはありません"
          description="コーチの受付ページ（インスタのプロフィールなどにあるリンク）から申し込むと、ここに添削のスレッドができます。"
        />
      ) : (
        <section className="space-y-3">
          <h2 className="text-heading">スレッド</h2>
          {threads.length === 0 ? (
            <p className="text-muted text-sm">スレッドの準備ができると、ここに表示されます。</p>
          ) : (
            <ThreadList threads={threads} viewer="student" />
          )}
        </section>
      )}
      {purchases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-heading">コーチ</h2>
          <MyCoachLinks coaches={uniqueCoaches(purchases)} />
        </section>
      )}
      {purchases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-heading">申し込み</h2>
          <MyPurchaseList purchases={purchases} showCoach />
        </section>
      )}
    </Page>
  )
}

export default MyPage
