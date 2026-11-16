import { MAINTENANCE_RULES } from '../rules'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type MaintenanceDates = Readonly<{
  /** この範囲に期限が来るスレッドの生徒に、期限が近いことを知らせる */
  remindExpiringFrom: Date
  remindExpiringTo: Date
  /** これより後に届いて、まだ添削していない提出を、返信の遅れの候補にする */
  unrepliedSince: Date
  /** これより前に終了したスレッドの動画を消す */
  deleteVideosClosedBefore: Date
  /** これより前に上げて、提出に使われなかった動画（下書き）を消す */
  deleteDraftsCreatedBefore: Date
}>

export type CalcMaintenanceDates = (now: Date) => MaintenanceDates

/**
 * 毎日の処理で使う日付
 *
 * ドメインルール:
 * - 期限の3日前に1回だけ知らせる（毎日動くので、範囲を1日分にする）
 * - 返信の遅れは、返信の期限（calcReplyDueAt）で決める。ここでは調べる範囲だけを出す
 * - 終了から90日で動画を消す
 * - 提出に使われなかった動画（下書き）は24時間で消す
 */
export const calcMaintenanceDates: CalcMaintenanceDates = (now) => {
  const days = MAINTENANCE_RULES.remindDaysBefore
  return {
    unrepliedSince: new Date(now.getTime() - MAINTENANCE_RULES.unrepliedLookbackDays * DAY_MS),
    remindExpiringFrom: new Date(now.getTime() + (days - 1) * DAY_MS),
    remindExpiringTo: new Date(now.getTime() + days * DAY_MS),
    deleteVideosClosedBefore: new Date(
      now.getTime() - MAINTENANCE_RULES.videoRetentionDays * DAY_MS
    ),
    deleteDraftsCreatedBefore: new Date(
      now.getTime() - MAINTENANCE_RULES.draftVideoRetentionHours * HOUR_MS
    ),
  }
}
