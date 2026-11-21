import 'server-only'
import { logInfo } from '@/server/utils/logger'
import { deleteMediaObject } from '@/server/utils/mediaStorage'
import { cleanupDrillVideos } from '../application/usecases/cleanupDrillVideos.usecase'
import { findOrphanDrillVideos } from '../infrastructure/query-services/drillVideoAccess'
import { deleteDrillVideos } from '../infrastructure/repositories/drillRepository'

/** 毎日の処理：使われていないドリルの動画を消す */
export const runDailyDrillVideoCleanup = async (now: Date) => {
  const result = await cleanupDrillVideos(
    { now },
    { findOrphanDrillVideos, deleteMediaObject, deleteDrillVideos }
  )
  if (result.deleted > 0) {
    logInfo('drill', '使われていないドリルの動画を消しました', { counts: result })
  }
}
