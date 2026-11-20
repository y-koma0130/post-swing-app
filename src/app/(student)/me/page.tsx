import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Notice } from '@/app/components/ui/Notice'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { MyPurchaseList } from '@/app/features/apply/components/MyPurchaseList'
import { MyCoachLinks } from '@/app/features/coach-profile/components/MyCoachLinks'
import { uniqueCoaches } from '@/app/features/coach-profile/utils/uniqueCoaches'
import { LineFriendPrompt } from '@/app/features/notification/components/LineFriendPrompt'
import { StudentLessonSections } from '@/app/features/thread/components/StudentLessonSections'
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
        <Notice tone="mint" status>
          <p>お支払いが完了しました。準備ができたら、ここから動画を送れます。</p>
        </Notice>
      )}
      {purchases.length === 0 && threads.length === 0 ? (
        <EmptyState
          title="まだ申し込みはありません"
          description="コーチの受付ページ（インスタのプロフィールなどにあるリンク）から申し込むと、ここに添削のレッスンが表示されます。"
        />
      ) : (
        <StudentLessonSections threads={threads} now={new Date()} />
      )}
      {purchases.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-heading">あなたのコーチ</h2>
            <p className="text-muted text-sm">押すと、そのコーチとのやりとりやプランを見られます</p>
          </div>
          <MyCoachLinks coaches={uniqueCoaches(purchases)} />
        </section>
      )}
      {purchases.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-heading">購入したプラン</h2>
            {purchases.some((p) => p.canManage && p.status === 'paid') && (
              <p className="text-muted text-sm">月額の解約・カードの変更はここから</p>
            )}
          </div>
          <MyPurchaseList purchases={purchases} showCoach />
        </section>
      )}
    </Page>
  )
}

export default MyPage
