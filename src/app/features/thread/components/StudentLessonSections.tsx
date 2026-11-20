import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import { groupStudentLessons } from '../utils/lessonGroups'
import { FinishedLessonList } from './FinishedLessonList'
import { ThreadList } from './ThreadList'

type Props = {
  threads: ThreadSummaryDto[]
  now: Date
  /** コーチの名前を出すか（コーチ詳細ページでは出さず、テーマを見出しにする） */
  showCounterpart?: boolean | undefined
}

/**
 * 生徒のレッスンの一覧。進行中（自分が動くものが先）と完了（終わった新しい順。はじめは10件）に分ける
 */
export const StudentLessonSections = ({ threads, now, showCounterpart = true }: Props) => {
  const { active, finished } = groupStudentLessons(threads)
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-heading">
          進行中のレッスン
          <span className="text-caption text-muted ml-2 font-normal">{active.length}件</span>
        </h2>
        {active.length === 0 ? (
          <p className="text-muted text-sm">進行中のレッスンはありません。</p>
        ) : (
          <ThreadList
            threads={active}
            viewer="student"
            now={now}
            showCounterpart={showCounterpart}
          />
        )}
      </section>
      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-heading">
            完了したレッスン
            <span className="text-caption text-muted ml-2 font-normal">{finished.length}件</span>
          </h2>
          <FinishedLessonList
            threads={finished}
            viewer="student"
            showCounterpart={showCounterpart}
          />
        </section>
      )}
    </div>
  )
}
