import { z } from 'zod'

/**
 * 日本時間の日付（YYYY-MM-DD）。不在期間など「何日から何日まで」を扱う
 *
 * サービスは日本向けなので、日付の境目はいつも日本時間の0時にする（サーバーは UTC で動く）。
 * 日本には夏時間がないので、UTC から9時間ずらせばよい
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const isRealDate = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形が正しくありません')
  .refine(isRealDate, 'ない日付です')
  .brand<'LocalDate'>()

export type LocalDate = z.infer<typeof localDateSchema>

/** その時刻が日本時間で何日か */
export const toLocalDate = (instant: Date): LocalDate =>
  localDateSchema.parse(new Date(instant.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10))

/** n 日後（負なら前）の日付 */
export const addDays = (date: LocalDate, days: number): LocalDate =>
  localDateSchema.parse(
    new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
  )

/** その日の日本時間0時の時刻 */
export const startOfLocalDate = (date: LocalDate): Date =>
  new Date(Date.parse(`${date}T00:00:00Z`) - JST_OFFSET_MS)

/** a から b までの日数（同じ日なら0、b が後なら正） */
export const diffDays = (a: LocalDate, b: LocalDate): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

/** 2つの期間（両端を含む）が重なる日数 */
export const overlapDays = (
  a: Readonly<{ start: LocalDate; end: LocalDate }>,
  b: Readonly<{ start: LocalDate; end: LocalDate }>
): number => {
  // 日付の文字列は辞書順で比べられる（Math.max・min は文字列に使えない）
  const [, start] = [a.start, b.start].toSorted()
  const [end] = [a.end, b.end].toSorted()
  if (start === undefined || end === undefined) return 0
  return end < start ? 0 : diffDays(start, end) + 1
}
