import 'server-only'
import { notify } from '@/server/features/notification/public'
import { runThreadMaintenance } from '../application/usecases/runThreadMaintenance.usecase'
import { deleteMediaObject } from '../infrastructure/external-services/videoStorage'
import {
  closeThreads,
  findExpiredOpenThreads,
  findThreadsExpiringBetween,
  findVideosToDelete,
  markVideosDeleted,
} from '../infrastructure/repositories/threadRepository'

/** 毎日の処理（スレッド）。Worker の scheduled ハンドラから呼ぶ */
export const runDailyThreadMaintenance = async (now: Date) => {
  const result = await runThreadMaintenance(
    { now },
    {
      findExpiredOpenThreads,
      closeThreads,
      findThreadsExpiringBetween,
      notifyThreadExpiring: (input) => notify({ kind: 'thread_expiring', ...input }),
      findVideosToDelete,
      deleteMediaObject,
      markVideosDeleted,
    }
  )
  if (result.ok) console.info('[scheduled] スレッド', result.value)
}
