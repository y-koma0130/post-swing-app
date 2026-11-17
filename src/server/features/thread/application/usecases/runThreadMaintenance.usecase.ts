import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
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
  /** since より後に届き、まだ添削していない提出（レッスン中のスレッド）。threadStartedAt はスレッドの開始 */
  findUnrepliedSubmissionsSince: (
    since: Date
  ) => Promise<
    Array<{ threadId: string; coachUserId: string; submittedAt: Date; threadStartedAt: Date }>
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
  ) => Promise<Array<{ threadId: string; videoR2Keys: string[] }>>
  /** 下書きのスレッドを、提出・動画の記録ごと消す */
  deleteDraftThreads: (threadIds: string[]) => Promise<void>
}>

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

  const toClose = expired
    .filter((t) => shouldCloseThread(withEffectiveExpiry(t, absencesOf(t.coachUserId)), now))
    .map((t) => t.id)
  if (toClose.length > 0) {
    await deps.closeThreads(toClose, now)
  }

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

  // 1スレッドに遅れた提出がいくつあっても、知らせるのは1回
  const overdue = new Map<string, string>()
  for (const s of unreplied) {
    const from = replyClockStart(s.submittedAt, s.threadStartedAt)
    if (isReplyDuePassedToday(calcReplyDueAt(from, absencesOf(s.coachUserId)), now)) {
      overdue.set(s.threadId, s.coachUserId)
    }
  }
  for (const [threadId, coachUserId] of overdue) {
    await deps.notifyReplyOverdue({ threadId, coachUserId })
  }

  const videos = await deps.findVideosToDelete(dates.deleteVideosClosedBefore)
  for (const v of videos) {
    await deps.deleteMediaObject(v.r2Key)
  }
  if (videos.length > 0) {
    await deps.markVideosDeleted(
      videos.map((v) => v.id),
      now
    )
  }

  const drafts = await deps.findDraftVideosToDelete(dates.deleteDraftsCreatedBefore)
  for (const v of drafts) {
    await deps.deleteMediaObject(v.r2Key)
  }
  if (drafts.length > 0) {
    await deps.deleteDraftVideos(drafts.map((v) => v.id))
  }

  // 期限までに承認されなかった申し込みは、断った扱いにしてカードの仮押さえを外す。
  // 外せなかったもの（Stripe の一時的な失敗）は承認待ちのまま残し、翌日にもう一度試す
  let expiredApplications = 0
  for (const a of await deps.findExpiredApplications(dates.expireApplicationsRequestedBefore)) {
    const voided = await deps.voidPayment(a.purchaseId)
    if (!voided.ok) continue
    await deps.saveDecline(a.threadId, { reason: 'expired', message: '', decidedAt: now })
    await deps.notifyApplicationExpired({ threadId: a.threadId, studentUserId: a.studentUserId })
    expiredApplications += 1
  }

  const draftThreads = await deps.findDraftThreadsToDelete(dates.deleteDraftThreadsCreatedBefore)
  for (const key of draftThreads.flatMap((t) => t.videoR2Keys)) {
    await deps.deleteMediaObject(key)
  }
  if (draftThreads.length > 0) {
    await deps.deleteDraftThreads(draftThreads.map((t) => t.threadId))
  }

  return ok({
    closed: toClose.length,
    reminded: toRemind.length,
    overdue: overdue.size,
    deletedVideos: videos.length,
    deletedDrafts: drafts.length,
    expiredApplications,
    deletedDraftThreads: draftThreads.length,
  })
}
