import { logError } from '@/server/utils/logger'
import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  /** デモでなければ null（何も消さない）。消したら、R2 から消すキーを返す */
  deleteDemoCoachData: (coachUserId: string) => Promise<string[] | null>
  deleteMediaObject: (r2Key: string) => Promise<void>
}>

export type DeleteDemoCoach = (
  params: Readonly<{ coachUserId: string }>,
  dependencies: Dependencies
) => Promise<Result<{ deletedObjects: number }, 'not_demo'>>

/**
 * デモのコーチを、データと動画ごと消す（管理画面と、期限が来たときの毎日の処理から）
 *
 * ドメインルール:
 * - デモのコーチだけ。本物のコーチ・生徒は決して消さない
 * - お手本の動画は、どのデモも使うので消さない（キーの一覧に入らない）
 * - 動画のファイルを消せなくても、データは消したまま進める（残ったファイルは参照されない）
 */
export const deleteDemoCoach: DeleteDemoCoach = async ({ coachUserId }, deps) => {
  const keys = await deps.deleteDemoCoachData(coachUserId)
  if (keys === null) return err('not_demo')
  let deletedObjects = 0
  for (const key of keys) {
    try {
      await deps.deleteMediaObject(key)
      deletedObjects += 1
    } catch (error) {
      logError('demo', '動画・画像を消せませんでした', error, { ids: { coachUserId } })
    }
  }
  return ok({ deletedObjects })
}
