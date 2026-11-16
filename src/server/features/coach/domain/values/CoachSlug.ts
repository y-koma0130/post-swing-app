import { z } from 'zod'

/**
 * コーチのスラッグ（受付ページのURLに使う）
 *
 * ドメインルール:
 * - 英小文字・数字・ハイフンのみ、3〜30文字
 */
export const coachSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]{3,30}$/, 'スラッグは英小文字・数字・ハイフンの3〜30文字です')
  .brand<'CoachSlug'>()

export type CoachSlug = z.infer<typeof coachSlugSchema>
