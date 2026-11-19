import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { chartEntryBodySchema } from '../../domain/values/StudentChart'

export type NewChartEntry = Readonly<{
  id: string
  coachUserId: string
  studentUserId: string
  body: string
  threadId: string | null
  createdAt: Date
}>

type Dependencies = Readonly<{
  hasLessonWith: (coachUserId: string, studentUserId: string) => Promise<boolean>
  /** スレッドの担当のコーチと生徒（申し込みの下書きなら null） */
  findThreadPair: (
    threadId: string
  ) => Promise<{ coachUserId: string; studentUserId: string } | null>
  saveEntry: (entry: NewChartEntry) => Promise<void>
  generateId: () => string
}>

export type AddChartEntry = (
  params: Readonly<{
    actor: Actor
    studentUserId: string
    body: string
    /** スレッドの画面から書いたとき、そのスレッド */
    threadId: string | null
    now: Date
  }>,
  dependencies: Dependencies
) => Promise<Result<{ entryId: string }, 'not_found' | 'invalid_body'>>

/**
 * カルテにレッスンの記録を足す。その生徒とレッスンがあったコーチ本人だけ。
 * スレッドを付けるなら、そのコーチとその生徒のスレッドに限る
 */
export const addChartEntry: AddChartEntry = async (params, deps) => {
  const coachUserId = params.actor.userId
  if (!(await deps.hasLessonWith(coachUserId, params.studentUserId))) return err('not_found')
  if (params.threadId !== null) {
    const pair = await deps.findThreadPair(params.threadId)
    if (!pair || pair.coachUserId !== coachUserId || pair.studentUserId !== params.studentUserId) {
      return err('not_found')
    }
  }
  const body = chartEntryBodySchema.safeParse(params.body)
  if (!body.success) return err('invalid_body')
  const entryId = deps.generateId()
  await deps.saveEntry({
    id: entryId,
    coachUserId,
    studentUserId: params.studentUserId,
    body: body.data,
    threadId: params.threadId,
    createdAt: params.now,
  })
  return ok({ entryId })
}
