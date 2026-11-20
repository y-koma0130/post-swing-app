import type { ThreadSummaryPageDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import { sortStudentLessons } from '../utils/lessonGroups'
import { FinishedLessonList } from './FinishedLessonList'
import { ThreadList } from './ThreadList'

type Props = {
  lessons: ThreadSummaryPageDto
  now: Date
  /** 完了の「もっと見る」の行き先 */
  moreHref: string
  /** コーチの名前を出すか（コーチ詳細ページでは出さず、テーマを見出しにする） */
  showCounterpart?: boolean | undefined
}

/**
 * 生徒のレッスンの一覧。進行中（自分が動くものが先）と、完了（終わった新しい順。サーバーで10件ずつ読む）に分ける
 */
export const StudentLessonSections = ({
  lessons,
  now,
  moreHref,
  showCounterpart = true,
}: Props) => {
  const active = sortStudentLessons(lessons.active)
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
      {lessons.finishedTotal > 0 && (
        <section className="space-y-3">
          <h2 className="text-heading">
            完了したレッスン
            <span className="text-caption text-muted ml-2 font-normal">
              {lessons.finishedTotal}件
            </span>
          </h2>
          <FinishedLessonList
            threads={lessons.finished}
            total={lessons.finishedTotal}
            moreHref={moreHref}
            viewer="student"
            showCounterpart={showCounterpart}
          />
        </section>
      )}
    </div>
  )
}
