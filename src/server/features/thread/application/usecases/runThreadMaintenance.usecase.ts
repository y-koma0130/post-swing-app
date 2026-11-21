import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import { logError } from '@/server/utils/logger'
import { ok, type Result } from '@/server/utils/result'
import {
  calcEffectiveExpiry,
  withEffectiveExpiry,
} from '../../domain/services/calcEffectiveExpiry.service'
import { calcMaintenanceDates } from '../../domain/services/calcMaintenanceDates.service'
import {
  calcReplyDueAt,
  isReplyDuePassedToday,
  replyClockStart,
} from '../../domain/services/calcReplyDueAt.service'
import { shouldCloseThread } from '../../domain/services/shouldCloseThread.service'
import type { Thread } from '../../domain/values/Thread'
import type { ThreadDecline } from './declineApplication.usecase'

type Dependencies = Readonly<{
  /** コーチごとの不在期間（coach が持つ） */
  findAbsencesForCoaches: (coachUserIds: string[]) => Promise<Map<string, CoachAbsence[]>>
  /** 保存した期限を過ぎて、まだ終了していないスレッド（実際の期限は不在の分だけ延びる） */
  findExpiredOpenThreads: (now: Date) => Promise<Thread[]>
  closeThreads: (threadIds: string[], closedAt: Date) => Promise<void>
  /** 生徒に「スレッドが終わりました。レビューをお願いします」と知らせる */
  notifyThreadClosed: (input: { threadId: string; studentUserId: string }) => Promise<void>
  /** 保存した期限が to より前の、終了していないスレッド */
  findOpenThreadsExpiringBy: (to: Date) => Promise<
    Array<{
      id: string
      coachUserId: string
      studentUserId: string
      startedAt: Date
      expiresAt: Date
    }>
  >
  notifyThreadExpiring: (input: { threadId: string; studentUserId: string }) => Promise<void>
  /**
   * since より後に届き、まだ添削していない提出（レッスン中のスレッド）。threadStartedAt はスレッドの開始。
   * 撮り直しのお願いの様子（開いているか・最後に終わった日時）も返す
   */
  findUnrepliedSubmissionsSince: (since: Date) => Promise<
    Array<{
      threadId: string
      coachUserId: string
      submittedAt: Date
      threadStartedAt: Date
      retakeOpen: boolean
      lastRetakeClosedAt: Date | null
    }>
  >
  notifyReplyOverdue: (input: { threadId: string; coachUserId: string }) => Promise<void>
  /** closedBefore より前に終了したスレッドの、まだ消していない動画 */
  findVideosToDelete: (closedBefore: Date) => Promise<Array<{ id: string; r2Key: string }>>
  deleteMediaObject: (r2Key: string) => Promise<void>
  markVideosDeleted: (videoIds: string[], deletedAt: Date) => Promise<void>
  /** createdBefore より前に上げて、提出に使われなかった動画（下書き） */
  findDraftVideosToDelete: (createdBefore: Date) => Promise<Array<{ id: string; r2Key: string }>>
  /** 下書きの動画の記録を消す（提出に使われていないので、残す理由がない） */
  deleteDraftVideos: (videoIds: string[]) => Promise<void>
  /** requestedBefore より前に承認を待ち始めて、まだ決まっていない申し込み */
  findExpiredApplications: (
    requestedBefore: Date
  ) => Promise<Array<{ threadId: string; studentUserId: string; purchaseId: string }>>
  /** カードの仮押さえを外す（purchase が持つ） */
  voidPayment: (purchaseId: string) => Promise<Result<unknown, string>>
  saveDecline: (threadId: string, decline: ThreadDecline) => Promise<void>
  notifyApplicationExpired: (input: { threadId: string; studentUserId: string }) => Promise<void>
  /** createdBefore より前に作り、カードを登録しないままの下書きのスレッドと、その動画の場所 */
  findDraftThreadsToDelete: (
    createdBefore: Date
  ) => Promise<Array<{ threadId: string; purchaseId: string; videoR2Keys: string[] }>>
  /** 下書きのスレッドを、提出・動画の記録ごと消す */
  deleteDraftThreads: (threadIds: string[]) => Promise<void>
  /** カードを登録しないままの申し込みを取り消す（purchase が持つ。モニターのコードの人数に数えなくなる） */
  releasePendingPurchase: (purchaseId: string) => Promise<boolean>
}>

/** 毎日の処理の区切り。1つが失敗しても、ほかは続ける */
export type MaintenanceStep =
  | 'close_expired'
  | 'remind_expiring'
  | 'notify_overdue'
  | 'delete_closed_videos'
  | 'delete_draft_videos'
  | 'expire_applications'
  | 'delete_draft_threads'

export type RunThreadMaintenance = (
  params: Readonly<{ now: Date }>,
  dependencies: Dependencies
) => Promise<
  Result<
    {
      closed: number
      reminded: number
      overdue: number
      deletedVideos: number
      deletedDrafts: number
      expiredApplications: number
      deletedDraftThreads: number
      /** 途中で失敗した処理（ほかの処理は続ける。翌日にもう一度試す） */
      failed: MaintenanceStep[]
    },
    never
  >
>

/**
 * 毎日1回の処理（Cron）。期限切れの終了、期限前のお知らせ、返信の遅れのお知らせ、古い動画と
 * 提出されなかった動画（下書き）の削除、承認されないままの申し込みのお断り、カードを登録しないままの
 * 申し込みの下書きの削除
 *
 * 判定は domain に任せる：期限は calcEffectiveExpiry（不在の分だけ延びる）、終了は shouldCloseThread、
 * 返信の期限は calcReplyDueAt、日付は calcMaintenanceDates
 */
export const runThreadMaintenance: RunThreadMaintenance = async ({ now }, deps) => {
  const dates = calcMaintenanceDates(now)
  const failed: MaintenanceStep[] = []
  /** 1つの区切りを動かす。失敗しても止めずに記録する（R2・Stripe・通知の一時的な失敗で、ほかの処理を止めない） */
  const step = async (name: MaintenanceStep, run: () => Promise<number>): Promise<number> => {
    try {
      return await run()
    } catch (error) {
      logError('scheduled', 'レッスンの毎日の処理の一部に失敗しました', error, { kind: name })
      failed.push(name)
      return 0
    }
  }
  /** R2 の動画を1つずつ消す。消せなかったものは残して、次の日にもう一度試す */
  const deleteObjects = async <T>(items: ReadonlyArray<T>, keyOf: (item: T) => string[]) => {
    const deleted: T[] = []
    for (const item of items) {
      try {
        for (const key of keyOf(item)) await deps.deleteMediaObject(key)
        deleted.push(item)
      } catch (error) {
        logError('scheduled', '動画を消せませんでした。翌日にもう一度試します', error)
      }
    }
    return deleted
  }

  const [expired, expiring, unreplied] = await Promise.all([
    deps.findExpiredOpenThreads(now),
    deps.findOpenThreadsExpiringBy(dates.remindExpiringTo),
    deps.findUnrepliedSubmissionsSince(dates.unrepliedSince),
  ])
  const absences = await deps.findAbsencesForCoaches([
    ...expired.map((t) => t.coachUserId),
    ...expiring.map((t) => t.coachUserId),
    ...unreplied.map((s) => s.coachUserId),
  ])
  const absencesOf = (coachUserId: string) => absences.get(coachUserId) ?? []

  const closed = await step('close_expired', async () => {
    const toClose = expired.filter((t) =>
      shouldCloseThread(withEffectiveExpiry(t, absencesOf(t.coachUserId)), now)
    )
    if (toClose.length === 0) return 0
    await deps.closeThreads(
      toClose.map((t) => t.id),
      now
    )
    for (const t of toClose) {
      await deps.notifyThreadClosed({ threadId: t.id, studentUserId: t.studentUserId })
    }
    return toClose.length
  })

  const reminded = await step('remind_expiring', async () => {
    const toRemind = expiring.filter((t) => {
      const { expiresAt } = calcEffectiveExpiry(t, absencesOf(t.coachUserId))
      return (
        expiresAt.getTime() > dates.remindExpiringFrom.getTime() &&
        expiresAt.getTime() <= dates.remindExpiringTo.getTime()
      )
    })
    for (const t of toRemind) {
      await deps.notifyThreadExpiring({ threadId: t.id, studentUserId: t.studentUserId })
    }
    return toRemind.length
  })

  const overdue = await step('notify_overdue', async () => {
    // 1スレッドに遅れた提出がいくつあっても、知らせるのは1回
    const threads = new Map<string, string>()
    for (const s of unreplied) {
      // 撮り直しを待っているあいだは、返信の期限を止める
      if (s.retakeOpen) continue
      const from = replyClockStart(s.submittedAt, s.threadStartedAt, s.lastRetakeClosedAt)
      if (isReplyDuePassedToday(calcReplyDueAt(from, absencesOf(s.coachUserId)), now)) {
        threads.set(s.threadId, s.coachUserId)
      }
    }
    for (const [threadId, coachUserId] of threads) {
      await deps.notifyReplyOverdue({ threadId, coachUserId })
    }
    return threads.size
  })

  const deletedVideos = await step('delete_closed_videos', async () => {
    const videos = await deleteObjects(
      await deps.findVideosToDelete(dates.deleteVideosClosedBefore),
      (v) => [v.r2Key]
    )
    if (videos.length > 0) {
      await deps.markVideosDeleted(
        videos.map((v) => v.id),
        now
      )
    }
    return videos.length
  })

  const deletedDrafts = await step('delete_draft_videos', async () => {
    const drafts = await deleteObjects(
      await deps.findDraftVideosToDelete(dates.deleteDraftsCreatedBefore),
      (v) => [v.r2Key]
    )
    if (drafts.length > 0) await deps.deleteDraftVideos(drafts.map((v) => v.id))
    return drafts.length
  })

  // 期限までに承認されなかった申し込みは、断った扱いにしてカードの仮押さえを外す。
  // 外せなかったもの（Stripe の一時的な失敗）は承認待ちのまま残し、翌日にもう一度試す
  const expiredApplications = await step('expire_applications', async () => {
    let count = 0
    for (const a of await deps.findExpiredApplications(dates.expireApplicationsRequestedBefore)) {
      const voided = await deps.voidPayment(a.purchaseId)
      if (!voided.ok) continue
      await deps.saveDecline(a.threadId, { reason: 'expired', message: '', decidedAt: now })
      await deps.notifyApplicationExpired({ threadId: a.threadId, studentUserId: a.studentUserId })
      count += 1
    }
    return count
  })

  const deletedDraftThreads = await step('delete_draft_threads', async () => {
    const draftThreads = await deleteObjects(
      await deps.findDraftThreadsToDelete(dates.deleteDraftThreadsCreatedBefore),
      (t) => t.videoR2Keys
    )
    if (draftThreads.length > 0) {
      await deps.deleteDraftThreads(draftThreads.map((t) => t.threadId))
    }
    for (const t of draftThreads) await deps.releasePendingPurchase(t.purchaseId)
    return draftThreads.length
  })

  return ok({
    closed,
    reminded,
    overdue,
    deletedVideos,
    deletedDrafts,
    expiredApplications,
    deletedDraftThreads,
    failed,
  })
}
