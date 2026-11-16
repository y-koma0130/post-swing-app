import { z } from 'zod'
import { localDateSchema } from '@/server/utils/localDate'
import { AVAILABILITY_RULES } from '../rules'

/**
 * コーチの不在期間（コーチが入力する部分）
 *
 * ドメインルール:
 * - 日付は日本時間。終了日も不在に含む（返信は終了日の翌日から）
 * - 生徒に見せる一言は任意で40字まで
 * - 不在中は受付ページからの新規申し込みを止めることもできる
 */
export const absenceInputSchema = z.object({
  startDate: localDateSchema,
  endDate: localDateSchema,
  note: z
    .string()
    .trim()
    .max(
      AVAILABILITY_RULES.absenceNoteMaxLength,
      `一言は${AVAILABILITY_RULES.absenceNoteMaxLength}文字までです`
    ),
  pauseNewSignups: z.boolean(),
})

export type AbsenceInput = z.infer<typeof absenceInputSchema>

export const coachAbsenceSchema = absenceInputSchema.extend({
  id: z.string().min(1),
  coachUserId: z.string().min(1),
})

export type CoachAbsence = z.infer<typeof coachAbsenceSchema>
