import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ShowMoreList } from '@/app/components/ShowMoreList'
import { Badge } from '@/app/components/ui/Badge'
import { Card } from '@/app/components/ui/Card'
import { CardLink } from '@/app/components/ui/CardLink'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { ChartEntries } from '@/app/features/student-chart/components/ChartEntries'
import { ChartMemo } from '@/app/features/student-chart/components/ChartMemo'
import { ChartTags } from '@/app/features/student-chart/components/ChartTags'
import { FINISHED_PAGE_SIZE } from '@/app/features/thread/utils/lessonGroups'
import { formatDateTime, formatMonthDay } from '@/app/utils/format'
import { THREAD_STATUS_LABEL } from '@/app/utils/threadText'
import { getActor } from '@/server/auth/getActor'
import { getStudentChart } from '@/server/features/student-chart/presentation/queries'

export const metadata: Metadata = { title: 'カルテ' }

type Props = {
  params: Promise<{ studentId: string }>
}

/** 生徒のカルテ（コーチだけ）。タグ・メモ・レッスンの記録・これまでのスレッド・送ったドリル */
const StudentChartPage = async ({ params }: Props) => {
  const { studentId } = await params
  if (!(await getActor())) redirect('/coach/login')
  const chart = await getStudentChart(studentId)
  if (!chart) notFound()
  // ドリルを送ったレッスンのテーマ（どのレッスンで送ったかを添える）
  const themeOf = new Map(chart.threads.map((t) => [t.id, t.theme]))

  return (
    <Page layout="list">
      <PageHeader
        back={{ href: '/coach/students', label: '生徒一覧' }}
        title={`${chart.studentName || '（名前なし）'}さんのカルテ`}
        description="生徒には見えません。"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-heading">タグ</h2>
            <ChartTags studentUserId={chart.studentUserId} tags={chart.tags} />
          </section>
          <section className="space-y-2">
            <h2 className="text-heading">メモ</h2>
            <ChartMemo studentUserId={chart.studentUserId} memo={chart.memo} />
          </section>
        </Card>
        <Card className="space-y-2">
          <h2 className="text-heading">レッスンの記録</h2>
          <ChartEntries studentUserId={chart.studentUserId} entries={chart.entries} />
        </Card>
      </div>
      <section className="space-y-3">
        <h2 className="text-heading">これまでのレッスン</h2>
        <ul className="space-y-2">
          {chart.threads.map((thread) => (
            <li key={thread.id}>
              <CardLink compact href={`/coach/threads/${thread.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate font-bold">
                    {thread.theme || '（動画待ち）'}
                  </p>
                  <Badge tone="neutral">{THREAD_STATUS_LABEL.coach[thread.status]}</Badge>
                </div>
                <p className="text-caption text-muted mt-0.5">
                  {formatMonthDay(thread.startedAt)}から
                </p>
              </CardLink>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-heading">送ったドリル</h2>
        {chart.drills.length === 0 ? (
          <p className="text-muted text-sm">まだドリルを送っていません。</p>
        ) : (
          // レッスンと同じ詰めたカードにする。押すと、送ったレッスンを開く。増えていくので、はじめは10件
          <ShowMoreList
            pageSize={FINISHED_PAGE_SIZE}
            className="space-y-2"
            items={chart.drills.map((drill) => ({
              key: `${drill.threadId}-${drill.sentAt.getTime()}-${drill.title}`,
              node: (
                <CardLink compact href={`/coach/threads/${drill.threadId}`}>
                  <p className="truncate font-bold">{drill.title}</p>
                  <p className="text-caption text-muted mt-0.5 flex gap-2">
                    <span className="min-w-0 truncate">
                      {themeOf.get(drill.threadId) || '（動画待ち）'}
                    </span>
                    <span className="ml-auto shrink-0">{formatDateTime(drill.sentAt)}に送信</span>
                  </p>
                </CardLink>
              ),
            }))}
          />
        )}
      </section>
    </Page>
  )
}

export default StudentChartPage
