import { MAINTENANCE_RULES } from '../rules'

const DAY_MS = 24 * 60 * 60 * 1000

export type MaintenanceDates = Readonly<{
  /** この範囲に期限が来るスレッドの生徒に、期限が近いことを知らせる */
  remindExpiringFrom: Date
  remindExpiringTo: Date
  /** これより前に終了したスレッドの動画を消す */
  deleteVideosClosedBefore: Date
}>

export type CalcMaintenanceDates = (now: Date) => MaintenanceDates

/**
 * 毎日の処理で使う日付
 *
 * ドメインルール:
 * - 期限の3日前に1回だけ知らせる（毎日動くので、範囲を1日分にする）
 * - 終了から90日で動画を消す
 */
export const calcMaintenanceDates: CalcMaintenanceDates = (now) => {
  const days = MAINTENANCE_RULES.remindDaysBefore
  return {
    remindExpiringFrom: new Date(now.getTime() + (days - 1) * DAY_MS),
    remindExpiringTo: new Date(now.getTime() + days * DAY_MS),
    deleteVideosClosedBefore: new Date(
      now.getTime() - MAINTENANCE_RULES.videoRetentionDays * DAY_MS
    ),
  }
}
