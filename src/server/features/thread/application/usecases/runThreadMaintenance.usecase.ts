import { ok, type Result } from '@/server/utils/result'
import { MAINTENANCE_RULES } from '../../domain/rules'
import { shouldCloseThread } from '../../domain/services/shouldCloseThread.service'
import type { Thread } from '../../domain/values/Thread'

const DAY_MS = 24 * 60 * 60 * 1000

type Dependencies = Readonly<{
  /** 期限を過ぎて、まだ終了していないスレッド */
  findExpiredOpenThreads: (now: Date) => Promise<Thread[]>
  closeThreads: (threadIds: string[], closedAt: Date) => Promise<void>
  /** 期限が from〜to にある、終了していないスレッド */
  findThreadsExpiringBetween: (
    from: Date,
    to: Date
  ) => Promise<Array<{ id: string; studentUserId: string }>>
  notifyThreadExpiring: (input: { threadId: string; studentUserId: string }) => Promise<void>
  /** closedBefore より前に終了したスレッドの、まだ消していない動画 */
  findVideosToDelete: (closedBefore: Date) => Promise<Array<{ id: string; r2Key: string }>>
  deleteMediaObject: (r2Key: string) => Promise<void>
  markVideosDeleted: (videoIds: string[], deletedAt: Date) => Promise<void>
}>

export type RunThreadMaintenance = (
  params: Readonly<{ now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ closed: number; reminded: number; deletedVideos: number }, never>>

/**
 * 毎日1回の処理（Cron）。期限切れの終了、期限前のお知らせ、古い動画の削除
 *
 * 毎日同じ時刻に動くので、「期限まで3日〜2日のもの」を知らせれば1スレッドにつき1回になる
 */
export const runThreadMaintenance: RunThreadMaintenance = async ({ now }, deps) => {
  const expired = await deps.findExpiredOpenThreads(now)
  const toClose = expired.filter((t) => shouldCloseThread(t, now)).map((t) => t.id)
  if (toClose.length > 0) {
    await deps.closeThreads(toClose, now)
  }

  const days = MAINTENANCE_RULES.remindDaysBefore
  const expiring = await deps.findThreadsExpiringBetween(
    new Date(now.getTime() + (days - 1) * DAY_MS),
    new Date(now.getTime() + days * DAY_MS)
  )
  for (const t of expiring) {
    await deps.notifyThreadExpiring({ threadId: t.id, studentUserId: t.studentUserId })
  }

  const videos = await deps.findVideosToDelete(
    new Date(now.getTime() - MAINTENANCE_RULES.videoRetentionDays * DAY_MS)
  )
  for (const v of videos) {
    await deps.deleteMediaObject(v.r2Key)
  }
  if (videos.length > 0) {
    await deps.markVideosDeleted(
      videos.map((v) => v.id),
      now
    )
  }

  return ok({ closed: toClose.length, reminded: expiring.length, deletedVideos: videos.length })
}
