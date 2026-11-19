import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { StudentChartDto } from '../dto/StudentChart.dto'

type Dependencies = Readonly<{
  /** スレッドの担当のコーチと生徒（申し込みの下書きなら null） */
  findThreadPair: (
    threadId: string
  ) => Promise<{ coachUserId: string; studentUserId: string } | null>
  findStudentChart: (coachUserId: string, studentUserId: string) => Promise<StudentChartDto | null>
}>

export type ViewChartForThread = (
  params: Readonly<{ actor: Actor; threadId: string }>,
  dependencies: Dependencies
) => Promise<Result<StudentChartDto, 'not_found'>>

/** 添削画面に出すカルテ。そのスレッドの担当のコーチだけ */
export const viewChartForThread: ViewChartForThread = async ({ actor, threadId }, deps) => {
  const pair = await deps.findThreadPair(threadId)
  if (!pair || pair.coachUserId !== actor.userId) return err('not_found')
  const chart = await deps.findStudentChart(pair.coachUserId, pair.studentUserId)
  return chart ? ok(chart) : err('not_found')
}
