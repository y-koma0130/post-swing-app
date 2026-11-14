import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  findDrillOwner: (drillId: string) => Promise<string | null>
  /** 送ったカードからは外す（カードは残す） */
  deleteDrill: (drillId: string) => Promise<void>
}>

export type DeleteDrill = (
  params: Readonly<{ actor: Actor; drillId: string }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found'>>

/** コーチが自分のドリルを消す */
export const deleteDrill: DeleteDrill = async ({ actor, drillId }, deps) => {
  if ((await deps.findDrillOwner(drillId)) !== actor.userId) {
    return err('not_found')
  }
  await deps.deleteDrill(drillId)
  return ok(undefined)
}
