import type { CoachAvailability } from '@/server/features/coach/domain/values/CoachAvailability'
import type { LocalDate } from '@/server/utils/localDate'

export type AbsenceAtSend = Readonly<{ absenceId: string; absenceEndDate: LocalDate }>

/**
 * 送ったときにコーチが不在中だったか（不在中なら、その不在）
 *
 * ドメインルール:
 * - 不在中に届いた動画・チャットは、どの不在中だったかを残す（あとで返信時間の集計から除く）
 * - 不在中に送られたら、スレッドに「戻り次第返信します」を出す（同じ不在・同じスレッドで1回だけ）
 */
export const absenceAtSend = (availability: CoachAvailability): AbsenceAtSend | null =>
  availability.kind === 'absent'
    ? { absenceId: availability.absence.id, absenceEndDate: availability.absence.endDate }
    : null
