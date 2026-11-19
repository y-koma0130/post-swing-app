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
/**
 * 年代（申し込みのときに聞く。幅で聞く）。18歳未満の生徒は、添削の公開を許可できない
 */
export const ageRangeSchema = z.enum(['under_18', '18_29', '30s', '40s', '50s', '60s', '70_plus'])

export type AgeRange = z.infer<typeof ageRangeSchema>

/** 添削の公開を許可できる年代か（18歳以上） */
export const isAdultAgeRange = (ageRange: AgeRange | null): boolean =>
  ageRange !== null && ageRange !== 'under_18'

export const golfProfileSchema = z.object({
  /** 年代。この機能より前の申し込みでは null */
  ageRange: ageRangeSchema.nullable(),
  roundFrequency: roundFrequencySchema.nullable(),
  averageScore: z.number().int().min(50).max(200).nullable(),
})

export type GolfProfile = z.infer<typeof golfProfileSchema>

/** フォームの文字から読む。空なら null、読めなければ失敗 */
export const parseGolfProfile = (input: {
  ageRange: string
  roundFrequency: string
  averageScore: string
}): GolfProfile | null => {
  const age = input.ageRange.trim()
  const frequency = input.roundFrequency.trim()
  const score = input.averageScore.trim()
  const parsed = golfProfileSchema.safeParse({
    ageRange: age === '' ? null : age,
    roundFrequency: frequency === '' ? null : frequency,
    averageScore: score === '' ? null : Number(score),
  })
  return parsed.success ? parsed.data : null
}
