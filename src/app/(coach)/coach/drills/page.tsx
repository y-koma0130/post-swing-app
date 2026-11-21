import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { DrillVideoPlayer } from '@/app/components/video/DrillVideoPlayer'
import { DeleteDrillButton } from '@/app/features/drill/components/DeleteDrillButton'
import { DrillForm } from '@/app/features/drill/components/DrillForm'
import { getCurrentCoach } from '@/server/features/coach/presentation/queries'
import { getMyDrills } from '@/server/features/drill/presentation/queries'

export const metadata: Metadata = { title: 'ドリル' }

/** ドリルの登録。レッスン（添削・チャット）で使い回す */
const DrillsPage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') redirect('/coach')
  const drills = await getMyDrills()

  return (
    <Page layout="form">
      <PageHeader
        title="ドリル"
        description="よく使う練習方法を登録しておくと、レッスンのとき（添削やチャット）に生徒へ送れます。"
      />
      <Card className="space-y-4">
        <h2 className="text-heading">新しいドリル</h2>
        <DrillForm />
      </Card>
      {drills.length === 0 && (
        <EmptyState
          title="まだドリルはありません"
          description="上のフォームから、よく使う練習方法をお手本の動画（アップロードした動画・YouTube・Instagram）つきで登録しましょう。"
        />
      )}
      <ul className="space-y-3">
        {drills.map((drill) => (
          <li key={drill.id}>
            <Card className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-heading">{drill.title}</h2>
                <DeleteDrillButton drillId={drill.id} title={drill.title} />
              </div>
              {drill.video ? (
                <DrillVideoPlayer video={drill.video} preload="metadata" />
              ) : (
                <p className="text-caption text-muted">
                  お手本の動画はありません（動画が必須になる前に登録したドリル）
                </p>
              )}
              {drill.description && (
                <p className="text-muted text-sm whitespace-pre-wrap">{drill.description}</p>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  )
}

export default DrillsPage
