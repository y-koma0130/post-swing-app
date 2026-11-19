import { DRILL_VIDEO_RULES } from '../../domain/rules'

type Dependencies = Readonly<{
  /** uploadedBefore より前に上げ、ドリルにも送った添削・チャットにも使われていない動画 */
  findOrphanDrillVideos: (uploadedBefore: Date) => Promise<Array<{ id: string; r2Key: string }>>
  deleteMediaObject: (r2Key: string) => Promise<void>
  deleteDrillVideos: (ids: string[]) => Promise<void>
}>

export type CleanupDrillVideos = (
  params: Readonly<{ now: Date }>,
  dependencies: Dependencies
) => Promise<{ deleted: number }>

/**
 * 使われていないドリルの動画を消す（毎日）
 *
 * ドメインルール:
 * - 登録しなかった下書きと、消したドリルのうち誰にも送っていない動画を消す
 * - 上げたばかりの動画（登録の途中）は消さない
 * - 送った添削・チャットから指されている動画は、ドリルを消しても残す
 */
export const cleanupDrillVideos: CleanupDrillVideos = async ({ now }, deps) => {
  const uploadedBefore = new Date(now.getTime() - DRILL_VIDEO_RULES.draftRetentionHours * 3600_000)
  const orphans = await deps.findOrphanDrillVideos(uploadedBefore)
  for (const video of orphans) {
    await deps.deleteMediaObject(video.r2Key)
  }
  await deps.deleteDrillVideos(orphans.map((v) => v.id))
  return { deleted: orphans.length }
}
