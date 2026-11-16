import { MAINTENANCE_RULES } from '../rules'

const DAY_MS = 24 * 60 * 60 * 1000

export type MaintenanceDates = Readonly<{
  /** この範囲に期限が来るスレッドの生徒に、期限が近いことを知らせる */
  remindExpiringFrom: Date
  remindExpiringTo: Date
  /** この範囲に届いて、まだ返信していない動画があれば、コーチに知らせる */
  overdueVideoFrom: Date
  overdueVideoTo: Date
  /** これより前に終了したスレッドの動画を消す */
  deleteVideosClosedBefore: Date
}>

export type CalcMaintenanceDates = (now: Date) => MaintenanceDates

/**
 * 毎日の処理で使う日付
 *
 * ドメインルール:
 * - 期限の3日前に1回だけ知らせる（毎日動くので、範囲を1日分にする）
 * - 動画が届いて3日たっても返信がなければ、コーチに1回だけ知らせる（範囲は同じく1日分）
 * - 終了から90日で動画を消す
 */
export const calcMaintenanceDates: CalcMaintenanceDates = (now) => {
  const days = MAINTENANCE_RULES.remindDaysBefore
  const overdueDays = MAINTENANCE_RULES.remindCoachAfterDays
  return {
    overdueVideoFrom: new Date(now.getTime() - (overdueDays + 1) * DAY_MS),
    overdueVideoTo: new Date(now.getTime() - overdueDays * DAY_MS),
    remindExpiringFrom: new Date(now.getTime() + (days - 1) * DAY_MS),
    remindExpiringTo: new Date(now.getTime() + days * DAY_MS),
    deleteVideosClosedBefore: new Date(
      now.getTime() - MAINTENANCE_RULES.videoRetentionDays * DAY_MS
    ),
  }
}
