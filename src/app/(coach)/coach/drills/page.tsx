import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { Page, PageHeader } from '@/app/components/ui/Page'
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
    <Page layout="form">
      <PageHeader
        title="ドリル"
        description="よく使う練習方法を登録しておくと、添削カードに添えて使い回せます。"
      />
      <Card className="space-y-4">
        <h2 className="text-heading">新しいドリル</h2>
        <DrillForm />
      </Card>
      <ul className="space-y-3">
        {drills.map((drill) => (
          <li key={drill.id}>
            <Card className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-heading">{drill.title}</h2>
                <form action={deleteDrillAction}>
                  <input type="hidden" name="drillId" value={drill.id} />
                  <button type="submit" className="text-muted text-sm underline">
                    消す
                  </button>
                </form>
              </div>
              <p className="text-muted text-sm whitespace-pre-wrap">{drill.description}</p>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  )
}

export default DrillsPage
