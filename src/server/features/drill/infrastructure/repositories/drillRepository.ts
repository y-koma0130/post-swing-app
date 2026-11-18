import 'server-only'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { drill, reviewCard } from '@/server/db/schema'
import type { DrillDto } from '../../application/dto/Drill.dto'
import type { DrillInput } from '../../domain/values/Drill'

export type SaveDrill = (d: DrillInput & { id: string; coachUserId: string }) => Promise<void>
export const saveDrill: SaveDrill = async (d) => {
  const now = new Date()
  await getDb()
    .insert(drill)
    .values({ ...d, createdAt: now, updatedAt: now })
}

export type FindDrillOwner = (drillId: string) => Promise<string | null>
export const findDrillOwner: FindDrillOwner = async (drillId) => {
  const row = await getDb()
    .select({ coachUserId: drill.coachUserId })
    .from(drill)
    .where(eq(drill.id, drillId))
    .get()
  return row?.coachUserId ?? null
}

export type DeleteDrill = (drillId: string) => Promise<void>
export const deleteDrill: DeleteDrill = async (drillId) => {
  const db = getDb()
  await db.batch([
    db.update(reviewCard).set({ drillId: null }).where(eq(reviewCard.drillId, drillId)),
    db.delete(drill).where(eq(drill.id, drillId)),
  ])
}

export type FindOwnDrillIds = (coachUserId: string, drillIds: string[]) => Promise<string[]>
export const findOwnDrillIds: FindOwnDrillIds = async (coachUserId, drillIds) => {
  if (drillIds.length === 0) return []
  const rows = await getDb()
    .select({ id: drill.id })
    .from(drill)
    .where(and(eq(drill.coachUserId, coachUserId), inArray(drill.id, drillIds)))
    .all()
  return rows.map((r) => r.id)
}

export type ListDrills = (coachUserId: string) => Promise<DrillDto[]>
export const listDrills: ListDrills = async (coachUserId) =>
  getDb()
    .select({ id: drill.id, title: drill.title, description: drill.description })
    .from(drill)
    .where(eq(drill.coachUserId, coachUserId))
    .orderBy(desc(drill.createdAt))
    .all()

export type FindOwnDrill = (
  coachUserId: string,
  drillId: string
) => Promise<{ title: string; description: string } | null>
/** そのコーチ自身のドリル（チャットで送るときに中身を写す）。ほかのコーチのものなら null */
export const findOwnDrill: FindOwnDrill = async (coachUserId, drillId) =>
  (await getDb()
    .select({ title: drill.title, description: drill.description })
    .from(drill)
    .where(and(eq(drill.coachUserId, coachUserId), eq(drill.id, drillId)))
    .get()) ?? null

export type FindOwnDrills = (
  coachUserId: string,
  drillIds: string[]
) => Promise<Array<{ id: string; title: string; description: string }>>
/** そのコーチ自身のドリル（添削におすすめとして添えるときに中身を写す） */
export const findOwnDrills: FindOwnDrills = async (coachUserId, drillIds) => {
  if (drillIds.length === 0) return []
  return getDb()
    .select({ id: drill.id, title: drill.title, description: drill.description })
    .from(drill)
    .where(and(eq(drill.coachUserId, coachUserId), inArray(drill.id, drillIds)))
    .all()
}
