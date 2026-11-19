import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { StudentChartDto } from '../dto/StudentChart.dto'

type Dependencies = Readonly<{
  /** そのコーチと生徒に、申し込み以降のスレッドがあるか */
  hasLessonWith: (coachUserId: string, studentUserId: string) => Promise<boolean>
  findStudentChart: (coachUserId: string, studentUserId: string) => Promise<StudentChartDto | null>
}>

export type ViewStudentChart = (
  params: Readonly<{ actor: Actor; studentUserId: string }>,
  dependencies: Dependencies
) => Promise<Result<StudentChartDto, 'not_found'>>

/** コーチが生徒のカルテを見る。その生徒とレッスンがあったコーチ本人だけ（生徒本人も見られない） */
export const viewStudentChart: ViewStudentChart = async ({ actor, studentUserId }, deps) => {
  if (!(await deps.hasLessonWith(actor.userId, studentUserId))) return err('not_found')
  const chart = await deps.findStudentChart(actor.userId, studentUserId)
  return chart ? ok(chart) : err('not_found')
}
