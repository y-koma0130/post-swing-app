import { ThreadList } from '@/app/features/thread/components/ThreadList'
import { getCurrentCoachSlug } from '@/server/features/coach/presentation/queries'
import { listThreadSummaries } from '@/server/features/thread/presentation/queries'

/** コーチのホーム */
const CoachHomePage = async () => {
  const threads = await listThreadSummaries(await getCurrentCoachSlug())

  return (
    <main>
      <h1 className="text-xl font-bold">スレッド</h1>
      <div className="mt-6">
        <ThreadList threads={threads} />
      </div>
    </main>
  )
}

export default CoachHomePage
