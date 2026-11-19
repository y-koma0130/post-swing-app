import { z } from 'zod'

/** ふだんのラウンドの回数（目安） */
export const roundFrequencySchema = z.enum([
  'not_yet',
  'few_per_year',
  'monthly',
  'two_to_three_per_month',
  'weekly',
])

export type RoundFrequency = z.infer<typeof roundFrequencySchema>

/**
 * 生徒のゴルフの様子（申し込みのときに書く。コーチが添削の参考にする）
 *
 * ドメインルール:
 * - どちらも任意（書かなければ null）
 * - 平均スコアは 50〜200 の整数
 * - 申し込みの時点の様子として、そのスレッドに残す（あとで変わっても書き換えない）
 */
export const golfProfileSchema = z.object({
  roundFrequency: roundFrequencySchema.nullable(),
  averageScore: z.number().int().min(50).max(200).nullable(),
})

export type GolfProfile = z.infer<typeof golfProfileSchema>

/** フォームの文字から読む。空なら null、読めなければ失敗 */
export const parseGolfProfile = (input: {
  roundFrequency: string
  averageScore: string
}): GolfProfile | null => {
  const frequency = input.roundFrequency.trim()
  const score = input.averageScore.trim()
  const parsed = golfProfileSchema.safeParse({
    roundFrequency: frequency === '' ? null : frequency,
    averageScore: score === '' ? null : Number(score),
  })
  return parsed.success ? parsed.data : null
}
