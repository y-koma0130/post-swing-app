import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  /** 記録を書いたコーチ（なければ null） */
  findEntryOwner: (entryId: string) => Promise<string | null>
  deleteEntry: (entryId: string) => Promise<void>
}>

export type DeleteChartEntry = (
  params: Readonly<{ actor: Actor; entryId: string }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found'>>

/** カルテの記録を消す。書いたコーチ本人だけ */
export const deleteChartEntry: DeleteChartEntry = async ({ actor, entryId }, deps) => {
  if ((await deps.findEntryOwner(entryId)) !== actor.userId) return err('not_found')
  await deps.deleteEntry(entryId)
  return ok(undefined)
}
