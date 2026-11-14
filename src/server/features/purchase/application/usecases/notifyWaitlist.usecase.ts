import { ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  /** 受付枠に空きがあり、キャンセル待ちがいるコーチと、空きの数 */
  findCoachesWithOpenSlots: () => Promise<Array<{ coachUserId: string; openSlots: number }>>
  /** まだ知らせていないキャンセル待ちを、登録の古い順に limit 人 */
  findWaitingStudents: (coachUserId: string, limit: number) => Promise<string[]>
  notifyWaitlistOpened: (input: { coachUserId: string; studentUserId: string }) => Promise<void>
  markWaitlistNotified: (coachUserId: string, studentUserIds: string[], at: Date) => Promise<void>
}>

export type NotifyWaitlist = (
  params: Readonly<{ now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ notified: number }, never>>

/**
 * 受付枠に空きが出たら、キャンセル待ちの古い順に知らせる（毎日の処理から呼ぶ）
 *
 * ドメインルール:
 * - 空きの数だけ知らせる。申し込みは早い者勝ち
 * - 同じ人には1回だけ知らせる
 */
export const notifyWaitlist: NotifyWaitlist = async ({ now }, deps) => {
  let notified = 0
  for (const coach of await deps.findCoachesWithOpenSlots()) {
    if (coach.openSlots <= 0) continue
    const students = await deps.findWaitingStudents(coach.coachUserId, coach.openSlots)
    for (const studentUserId of students) {
      await deps.notifyWaitlistOpened({ coachUserId: coach.coachUserId, studentUserId })
    }
    if (students.length > 0) {
      await deps.markWaitlistNotified(coach.coachUserId, students, now)
      notified += students.length
    }
  }
  return ok({ notified })
}
