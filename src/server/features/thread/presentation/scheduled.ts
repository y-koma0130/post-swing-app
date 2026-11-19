import 'server-only'
import {
  findAbsencesEndingOn,
  findCoachAvailabilityFactsForCoaches,
} from '@/server/features/coach/public'
import { notify } from '@/server/features/notification/public'
import { voidPayment } from '@/server/features/purchase/public'
import { notifyAbsenceEnded } from '../application/usecases/notifyAbsenceEnded.usecase'
import { runThreadMaintenance } from '../application/usecases/runThreadMaintenance.usecase'
import { deleteMediaObject } from '../infrastructure/external-services/videoStorage'
import {
  closeThreads,
  countAbsenceBacklog,
  deleteDraftThreads,
  deleteDraftVideos,
  findDraftThreadsToDelete,
  findDraftVideosToDelete,
  findExpiredApplications,
  findExpiredOpenThreads,
  findOpenThreadsExpiringBy,
  findUnrepliedSubmissionsSince,
  findVideosToDelete,
  markVideosDeleted,
} from '../infrastructure/repositories/maintenanceRepository'
import { saveDecline } from '../infrastructure/repositories/threadRepository'

/** 毎日の処理（スレッド）。Worker の scheduled ハンドラから呼ぶ */
export const runDailyThreadMaintenance = async (now: Date) => {
  const result = await runThreadMaintenance(
    { now },
    {
      findAbsencesForCoaches: async (ids) => {
        const facts = await findCoachAvailabilityFactsForCoaches(ids)
        return new Map([...facts].map(([id, f]) => [id, f.absences]))
      },
      findExpiredOpenThreads,
      closeThreads,
      notifyThreadClosed: (input) => notify({ kind: 'thread_closed', ...input }),
      findOpenThreadsExpiringBy,
      notifyThreadExpiring: (input) => notify({ kind: 'thread_expiring', ...input }),
      findUnrepliedSubmissionsSince,
      notifyReplyOverdue: (input) => notify({ kind: 'reply_overdue', ...input }),
      findVideosToDelete,
      deleteMediaObject,
      markVideosDeleted,
      findDraftVideosToDelete,
      deleteDraftVideos,
      findExpiredApplications,
      voidPayment,
      saveDecline,
      notifyApplicationExpired: (input) => notify({ kind: 'application_expired', ...input }),
      findDraftThreadsToDelete,
      deleteDraftThreads,
    }
  )
  if (result.ok) console.info('[scheduled] レッスン', result.value)
}

/** 不在が明けた朝の処理（日本時間9時の Cron）。不在中に届いた件数をコーチに知らせる */
export const runAbsenceEndedNotification = async (now: Date) => {
  const result = await notifyAbsenceEnded(
    { now },
    {
      findAbsencesEndingOn,
      countAbsenceBacklog,
      notifyAbsenceEnded: (input) => notify({ kind: 'absence_ended', ...input }),
    }
  )
  if (result.ok) console.info('[scheduled] 不在明け', result.value)
}
