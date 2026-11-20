import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Badge } from '@/app/components/ui/Badge'
import { CardLink } from '@/app/components/ui/CardLink'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { formatMonthDay } from '@/app/utils/format'
import { getCurrentCoach } from '@/server/features/coach/presentation/queries'
import { getMyStudents } from '@/server/features/student-chart/presentation/queries'

export const metadata: Metadata = { title: '生徒一覧' }

/** コーチの生徒の一覧（レッスンがあった生徒）。押すとカルテを開く */
const StudentsPage = async () => {
  const current = await getCurrentCoach()
  if (current.kind === 'signed_out') redirect('/coach/login')
  if (current.kind === 'not_coach') redirect('/coach')
  const students = (await getMyStudents()) ?? []

  return (
    <Page layout="list">
      <PageHeader
        title="生徒一覧"
        description="生徒ごとのカルテ（メモ・タグ・レッスンの記録）です。生徒には見えません。"
      />
      {students.length === 0 ? (
        <EmptyState
          title="まだ生徒はいません"
          description="申し込みがあると、ここに生徒が並びます。"
        />
      ) : (
        <ul className="space-y-2">
          {students.map((student) => (
            // 1行目：名前とレッスン中の札、2行目：タグ（長ければ省略）と、レッスンの件数・最後のやりとり
            <li key={student.studentUserId}>
              <CardLink compact href={`/coach/students/${student.studentUserId}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate font-bold">
                    {student.name || '（名前なし）'}
                  </p>
                  {student.inLesson && <Badge tone="mint">レッスン中</Badge>}
                </div>
                <p className="text-caption text-muted mt-0.5 flex gap-2">
                  {student.tags.length > 0 && (
                    <span className="min-w-0 truncate">{student.tags.join('・')}</span>
                  )}
                  <span className="ml-auto shrink-0">
                    レッスン {student.threadCount}件・{formatMonthDay(student.lastActivityAt)}
                  </span>
                </p>
              </CardLink>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}

export default StudentsPage
