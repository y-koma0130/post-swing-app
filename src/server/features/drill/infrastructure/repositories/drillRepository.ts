import 'server-only'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { drill, drillVideo, reviewCard } from '@/server/db/schema'
import type { DrillDto } from '../../application/dto/Drill.dto'
import type { NewDrillVideo } from '../../application/usecases/uploadDrillVideo.usecase'
import type { DrillInput } from '../../domain/values/Drill'

export type SaveDrill = (d: DrillInput & { id: string; coachUserId: string }) => Promise<void>
export const saveDrill: SaveDrill = async (d) => {
  const now = new Date()
  await getDb()
    .insert(drill)
    .values({ ...d, createdAt: now, updatedAt: now })
}

export type SaveDrillVideo = (video: NewDrillVideo) => Promise<void>
export const saveDrillVideo: SaveDrillVideo = async (video) => {
  await getDb().insert(drillVideo).values(video)
}

export type IsUnusedOwnDrillVideo = (coachUserId: string, videoId: string) => Promise<boolean>
/** そのコーチが上げた動画で、まだどのドリルにも使っていないか（ほかのドリルの動画を付け替えさせない） */
export const isUnusedOwnDrillVideo: IsUnusedOwnDrillVideo = async (coachUserId, videoId) => {
  const row = await getDb()
    .select({ id: drillVideo.id })
    .from(drillVideo)
    .leftJoin(drill, eq(drill.videoId, drillVideo.id))
    .where(
      and(eq(drillVideo.id, videoId), eq(drillVideo.coachUserId, coachUserId), isNull(drill.id))
    )
    .get()
  return row !== undefined
}

export type DeleteDrillVideos = (ids: string[]) => Promise<void>
export const deleteDrillVideos: DeleteDrillVideos = async (ids) => {
  if (ids.length === 0) return
  await getDb().delete(drillVideo).where(inArray(drillVideo.id, ids))
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
    .select({
      id: drill.id,
      title: drill.title,
      description: drill.description,
      videoId: drill.videoId,
    })
    .from(drill)
    .where(eq(drill.coachUserId, coachUserId))
    .orderBy(desc(drill.createdAt))
    .all()

export type FindOwnDrill = (
  coachUserId: string,
  drillId: string
) => Promise<{ title: string; description: string; videoId: string | null } | null>
/** そのコーチ自身のドリル（チャットで送るときに中身を写す）。ほかのコーチのものなら null */
export const findOwnDrill: FindOwnDrill = async (coachUserId, drillId) =>
  (await getDb()
    .select({ title: drill.title, description: drill.description, videoId: drill.videoId })
    .from(drill)
    .where(and(eq(drill.coachUserId, coachUserId), eq(drill.id, drillId)))
    .get()) ?? null

export type FindOwnDrills = (
  coachUserId: string,
  drillIds: string[]
) => Promise<Array<{ id: string; title: string; description: string; videoId: string | null }>>
/** そのコーチ自身のドリル（添削におすすめとして添えるときに中身を写す） */
export const findOwnDrills: FindOwnDrills = async (coachUserId, drillIds) => {
  if (drillIds.length === 0) return []
  return getDb()
    .select({
      id: drill.id,
      title: drill.title,
      description: drill.description,
      videoId: drill.videoId,
    })
    .from(drill)
    .where(and(eq(drill.coachUserId, coachUserId), inArray(drill.id, drillIds)))
    .all()
}
