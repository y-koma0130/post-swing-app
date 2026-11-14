import 'server-only'
import { enqueueNotification } from '@/server/features/notification/infrastructure/external-services/enqueueNotification'
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
      notifyThreadExpiring: (input) => enqueueNotification({ kind: 'thread_expiring', ...input }),
      findVideosToDelete,
      deleteMediaObject,
      markVideosDeleted,
    }
  )
  if (result.ok) console.info('[scheduled] スレッド', result.value)
}
