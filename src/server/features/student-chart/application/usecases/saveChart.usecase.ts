import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { chartMemoSchema, chartTagsSchema } from '../../domain/values/StudentChart'

type Dependencies = Readonly<{
  hasLessonWith: (coachUserId: string, studentUserId: string) => Promise<boolean>
  /** メモかタグを書く（カルテがまだなければ作る） */
  saveChart: (input: {
    coachUserId: string
    studentUserId: string
    memo?: string | undefined
    tags?: string[] | undefined
    updatedAt: Date
  }) => Promise<void>
}>

export type SaveChartError = 'not_found' | 'invalid_memo' | 'invalid_tags'

export type SaveChart = (
  params: Readonly<{
    actor: Actor
    studentUserId: string
    /** 書き換えるものだけを渡す */
    memo?: string | undefined
    tags?: ReadonlyArray<string> | undefined
    now: Date
  }>,
  dependencies: Dependencies
) => Promise<Result<{ tags: string[] | null }, SaveChartError>>

/** コーチがカルテのメモ・タグを書く。その生徒とレッスンがあったコーチ本人だけ */
export const saveChart: SaveChart = async (params, deps) => {
  if (!(await deps.hasLessonWith(params.actor.userId, params.studentUserId))) {
    return err('not_found')
  }
  const memo = params.memo === undefined ? undefined : chartMemoSchema.safeParse(params.memo)
  if (memo && !memo.success) return err('invalid_memo')
  const tags = params.tags === undefined ? undefined : chartTagsSchema.safeParse(params.tags)
  if (tags && !tags.success) return err('invalid_tags')
  await deps.saveChart({
    coachUserId: params.actor.userId,
    studentUserId: params.studentUserId,
    memo: memo?.data,
    tags: tags?.data,
    updatedAt: params.now,
  })
  return ok({ tags: tags?.data ?? null })
}
