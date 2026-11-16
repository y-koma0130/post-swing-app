import { z } from 'zod'

/**
 * コーチへのレビュー
 *
 * ドメインルール:
 * - 星は1〜5
 * - 終わったスレッドに、生徒が1回だけ書ける。コーチは1回だけ返信できる
 */
export const coachReviewInputSchema = z.object({
  rating: z.number().int().min(1, '星を選んでください').max(5),
  comment: z.string().trim().max(1000, 'コメントは1000文字までです'),
})

export type CoachReviewInput = z.infer<typeof coachReviewInputSchema>

export const coachReviewReplySchema = z
  .string()
  .trim()
  .min(1, '返信を書いてください')
  .max(1000, '返信は1000文字までです')
