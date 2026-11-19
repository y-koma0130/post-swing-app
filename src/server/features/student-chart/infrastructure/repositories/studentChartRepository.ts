import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { studentChart, studentChartEntry } from '@/server/db/schema'
import type { NewChartEntry } from '../../application/usecases/addChartEntry.usecase'

export type SaveChart = (input: {
  coachUserId: string
  studentUserId: string
  memo?: string | undefined
  tags?: string[] | undefined
  updatedAt: Date
}) => Promise<void>
/** メモかタグを書く（カルテがまだなければ作る）。渡さなかったほうは変えない */
export const saveChart: SaveChart = async ({
  coachUserId,
  studentUserId,
  memo,
  tags,
  updatedAt,
}) => {
  await getDb()
    .insert(studentChart)
    .values({ coachUserId, studentUserId, memo: memo ?? '', tags: tags ?? [], updatedAt })
    .onConflictDoUpdate({
      target: [studentChart.coachUserId, studentChart.studentUserId],
      set: {
        ...(memo === undefined ? {} : { memo }),
        ...(tags === undefined ? {} : { tags }),
        updatedAt,
      },
    })
}

export type SaveEntry = (entry: NewChartEntry) => Promise<void>
export const saveEntry: SaveEntry = async (entry) => {
  await getDb().insert(studentChartEntry).values(entry)
}

export type FindEntryOwner = (entryId: string) => Promise<string | null>
export const findEntryOwner: FindEntryOwner = async (entryId) =>
  (
    await getDb()
      .select({ coachUserId: studentChartEntry.coachUserId })
      .from(studentChartEntry)
      .where(eq(studentChartEntry.id, entryId))
      .get()
  )?.coachUserId ?? null

export type DeleteEntry = (entryId: string) => Promise<void>
export const deleteEntry: DeleteEntry = async (entryId) => {
  await getDb().delete(studentChartEntry).where(eq(studentChartEntry.id, entryId))
}
