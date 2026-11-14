import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { DrillForm } from '@/app/features/drill/components/DrillForm'
import { getCurrentCoach } from '@/server/features/coach/presentation/queries'
import { deleteDrillAction } from '@/server/features/drill/presentation/actions'
import { getMyDrills } from '@/server/features/drill/presentation/queries'

export const metadata: Metadata = { title: 'ドリル' }

/** ドリルの登録。添削カードに添えて使い回す */
const DrillsPage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') redirect('/coach')
  const drills = await getMyDrills()

  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">ドリル</h1>
      <Card className="space-y-4">
        <h2 className="font-bold">新しいドリル</h2>
        <DrillForm />
      </Card>
      <ul className="space-y-3">
        {drills.map((drill) => (
          <li key={drill.id}>
            <Card className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-bold">{drill.title}</h2>
                <form action={deleteDrillAction}>
                  <input type="hidden" name="drillId" value={drill.id} />
                  <button type="submit" className="text-sm text-gray-500 underline">
                    消す
                  </button>
                </form>
              </div>
              <p className="text-sm whitespace-pre-wrap text-gray-600">{drill.description}</p>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default DrillsPage
