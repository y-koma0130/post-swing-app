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
        <ul className="space-y-3">
          {students.map((student) => (
            <li key={student.studentUserId}>
              <CardLink
                href={`/coach/students/${student.studentUserId}`}
                className="flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-bold">{student.name || '（名前なし）'}</p>
                  {student.tags.length > 0 && (
                    <p className="text-caption text-muted truncate">{student.tags.join('・')}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {student.inLesson && <Badge tone="mint">レッスン中</Badge>}
                  <p className="text-caption text-muted">
                    レッスン {student.threadCount}件・{formatMonthDay(student.lastActivityAt)}
                  </p>
                </div>
              </CardLink>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}

export default StudentsPage
