import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { ThreadList } from '@/app/features/thread/components/ThreadList'
import { getCurrentCoach } from '@/server/features/coach/presentation/queries'
import { listThreadSummaries } from '@/server/features/thread/presentation/queries'

/** コーチのホーム */
const CoachHomePage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') {
    return (
      <main className="mx-auto max-w-md">
        <Card className="space-y-2">
          <h1 className="font-bold">コーチとして登録されていません</h1>
          <p className="text-sm text-gray-600">
            SwingPost は招待制です。招待を受けたメールアドレスでログインしてください。
          </p>
        </Card>
      </main>
    )
  }
  const { settings } = current
  const threads = await listThreadSummaries(settings.slug)

  return (
    <main className="space-y-6">
      {!settings.chargesEnabled && (
        <Card className="space-y-1 border-amber-200 bg-amber-50">
          <p className="font-bold">まだ申し込みを受け付けていません</p>
          <p className="text-sm text-gray-700">
            売上を受け取る口座を設定すると、受付ページから申し込めるようになります。
            <Link href="/coach/settings" className="ml-1 underline">
              設定へ
            </Link>
          </p>
        </Card>
      )}
      <h1 className="text-xl font-bold">スレッド</h1>
      <ThreadList threads={threads} />
    </main>
  )
}

export default CoachHomePage
