import type { LocalDate } from '@/server/utils/localDate'
import type { CoachAbsence } from './CoachAbsence'

/**
 * コーチの今の状態（返信できるか）
 * - available: 通常。返信目安の時間以内に返す
 * - absent: 不在期間中。返信は resumeDate（終了日の翌日）から
 * - delayed: 返信遅れフラグ。期間は決めず「遅れる場合がある」とだけ伝える
 */
export type CoachAvailability =
  | Readonly<{ kind: 'available'; replyTargetHours: number }>
  | Readonly<{ kind: 'absent'; absence: CoachAbsence; resumeDate: LocalDate }>
  | Readonly<{ kind: 'delayed' }>
