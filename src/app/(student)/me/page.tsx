import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { LineFriendPrompt } from '@/app/features/notification/components/LineFriendPrompt'
import { ThreadList } from '@/app/features/thread/components/ThreadList'
import { formatYen } from '@/app/utils/format'
import { getLineFriendPrompt } from '@/server/features/notification/presentation/queries'
import { openBillingPortalAction } from '@/server/features/purchase/presentation/actions'
import { getMyPurchases } from '@/server/features/purchase/presentation/queries'
import { getMyThreadSummaries } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: 'マイページ' }

type Props = {
  searchParams: Promise<{ checkout?: string }>
}

const PLAN_LABEL = { trial: 'お試し', single: '1スレッド', monthly: '月額' } as const

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
    <main className="space-y-6 px-6 py-10">
      <h1 className="text-xl font-bold">マイページ</h1>
      {linePrompt && <LineFriendPrompt addFriendUrl={linePrompt.addFriendUrl} />}
      {checkout === 'success' && (
        <p className="bg-mint-soft text-ink rounded-xl p-4 text-sm">
          お支払いが完了しました。スレッドの準備ができたら、ここから動画を送れます。
        </p>
      )}
      <section className="space-y-3">
        <h2 className="font-bold">スレッド</h2>
        {threads.length === 0 ? (
          <p className="text-sm text-gray-500">まだスレッドはありません。</p>
        ) : (
          <ThreadList threads={threads} viewer="student" />
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">申し込み</h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">まだ申し込みはありません。</p>
        ) : (
          purchases.map((p) => (
            <Card key={p.id} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Link href={`/c/${p.coachSlug}`} className="font-bold">
                  {p.coachName}
                </Link>
                <span className="text-sm text-gray-500">
                  {PLAN_LABEL[p.planKind]}・{formatYen(p.priceYen)}
                  {p.status === 'canceled' && '（解約済み）'}
                </span>
              </div>
              {p.canManage && p.status === 'paid' && (
                <form action={openBillingPortalAction}>
                  <input type="hidden" name="purchaseId" value={p.id} />
                  <button type="submit" className="text-sm text-gray-600 underline">
                    月額の解約・カードの変更
                  </button>
                </form>
              )}
            </Card>
          ))
        )}
      </section>
    </main>
  )
}

export default MyPage
