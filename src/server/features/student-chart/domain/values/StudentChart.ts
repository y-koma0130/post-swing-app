import { z } from 'zod'
import { STUDENT_CHART_RULES } from '../rules'

/**
 * 生徒ごとのカルテ（コーチと生徒の組ごと）
 *
 * ドメインルール:
 * - 見られるのは、その生徒とレッスン（申し込み以降のスレッド）があったコーチ本人だけ。生徒には一切見せない
 * - メモは5000文字まで
 * - タグは20文字まで・10個まで。同じタグは1つにまとめる
 * - レッスンの記録は1件1000文字まで
 */
export const chartMemoSchema = z
  .string()
  .max(STUDENT_CHART_RULES.maxMemoLength, `メモは${STUDENT_CHART_RULES.maxMemoLength}文字までです`)

export const chartTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(STUDENT_CHART_RULES.maxTagLength, `タグは${STUDENT_CHART_RULES.maxTagLength}文字までです`)

export const chartTagsSchema = z
  .array(chartTagSchema)
  .transform((tags) => [...new Set(tags)])
  .pipe(
    z
      .array(z.string())
      .max(STUDENT_CHART_RULES.maxTags, `タグは${STUDENT_CHART_RULES.maxTags}個までです`)
  )

export const chartEntryBodySchema = z
  .string()
  .trim()
  .min(1, '記録を書いてください')
  .max(
    STUDENT_CHART_RULES.maxEntryLength,
    `記録は${STUDENT_CHART_RULES.maxEntryLength}文字までです`
  )
