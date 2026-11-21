import { logError } from '@/server/utils/logger'
import { ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  findExpiredDemoCoaches: (now: Date) => Promise<string[]>
  deleteDemoCoach: (coachUserId: string) => Promise<unknown>
}>

export type DeleteExpiredDemos = (
  params: Readonly<{ now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ deleted: number }, never>>

/** 期限を過ぎたデモのコーチを消す（毎日の処理から。1人が失敗しても、ほかは続ける） */
export const deleteExpiredDemos: DeleteExpiredDemos = async ({ now }, deps) => {
  let deleted = 0
  for (const coachUserId of await deps.findExpiredDemoCoaches(now)) {
    try {
      await deps.deleteDemoCoach(coachUserId)
      deleted += 1
    } catch (error) {
      logError('demo', 'デモを消せませんでした', error, { ids: { coachUserId } })
    }
  }
  return ok({ deleted })
}
