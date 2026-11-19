import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/app/components/ui/Badge'
import { Card } from '@/app/components/ui/Card'
import { CardLink } from '@/app/components/ui/CardLink'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { ChartEntries } from '@/app/features/student-chart/components/ChartEntries'
import { ChartMemo } from '@/app/features/student-chart/components/ChartMemo'
import { ChartTags } from '@/app/features/student-chart/components/ChartTags'
import { THREAD_STATUS_LABEL } from '@/app/features/thread/utils/threadText'
import { formatDateTime, formatMonthDay } from '@/app/utils/format'
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
        <ul className="space-y-3">
          {chart.threads.map((thread) => (
            <li key={thread.id}>
              <CardLink
                href={`/coach/threads/${thread.id}`}
                className="flex items-center justify-between gap-4"
              >
                <p className="min-w-0 flex-1 truncate font-bold">
                  {thread.theme || '（動画待ち）'}
                </p>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone="neutral">{THREAD_STATUS_LABEL.coach[thread.status]}</Badge>
                  <span className="text-caption text-muted">
                    {formatMonthDay(thread.startedAt)}から
                  </span>
                </span>
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
          <ul className="divide-line-soft border-line-soft divide-y border-y bg-white">
            {chart.drills.map((drill) => (
              <li
                key={`${drill.threadId}-${drill.sentAt.getTime()}-${drill.title}`}
                className="flex items-baseline justify-between gap-2 px-3 py-2"
              >
                <span className="text-body text-sm">{drill.title}</span>
                <span className="text-caption text-muted shrink-0">
                  {formatDateTime(drill.sentAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  )
}

export default StudentChartPage
