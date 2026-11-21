import 'server-only'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { drill, drillVideo, reviewCard } from '@/server/db/schema'
import type { DrillDto } from '../../application/dto/Drill.dto'
import type { NewDrill } from '../../application/usecases/createDrill.usecase'
import type { NewDrillVideo } from '../../application/usecases/uploadDrillVideo.usecase'
import {
  type DrillVideo,
  type DrillVideoColumns,
  drillVideoFromColumns,
  toDrillVideoColumns,
} from '../../domain/values/DrillVideo'
import { toDrillVideoDto } from '../query-services/drillVideoView'

/** ドリルの行から読む、お手本の動画の列 */
const videoColumns = {
  uploadVideoId: drill.videoId,
  youtubeVideoId: drill.youtubeVideoId,
  youtubeStartSec: drill.youtubeStartSec,
  youtubeVertical: drill.youtubeVertical,
  instagramPostKind: drill.instagramPostKind,
  instagramShortcode: drill.instagramShortcode,
}

/** そのコーチのドリルを、ほかの feature に写すときの形 */
export type OwnDrill = { id: string; title: string; description: string; video: DrillVideo | null }

export type SaveDrill = (d: NewDrill) => Promise<void>
export const saveDrill: SaveDrill = async ({ video, ...d }) => {
  const now = new Date()
  const columns = toDrillVideoColumns(video)
  await getDb()
    .insert(drill)
    .values({
      ...d,
      videoId: columns.uploadVideoId,
      youtubeVideoId: columns.youtubeVideoId,
      youtubeStartSec: columns.youtubeStartSec,
      youtubeVertical: columns.youtubeVertical,
      instagramPostKind: columns.instagramPostKind,
      instagramShortcode: columns.instagramShortcode,
      createdAt: now,
      updatedAt: now,
    })
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
export const listDrills: ListDrills = async (coachUserId) => {
  const rows = await getDb()
    .select({ id: drill.id, title: drill.title, description: drill.description, ...videoColumns })
    .from(drill)
    .where(eq(drill.coachUserId, coachUserId))
    .orderBy(desc(drill.createdAt))
    .all()
  return rows.map(({ id, title, description, ...columns }) => ({
    id,
    title,
    description,
    video: toDrillVideoDto(drillVideoFromColumns(columns)),
  }))
}

type OwnDrillRow = Omit<OwnDrill, 'video'> & DrillVideoColumns

const toOwnDrill = ({ id, title, description, ...columns }: OwnDrillRow): OwnDrill => ({
  id,
  title,
  description,
  video: drillVideoFromColumns(columns),
})

const ownDrillColumns = {
  id: drill.id,
  title: drill.title,
  description: drill.description,
  ...videoColumns,
}

export type FindOwnDrill = (
  coachUserId: string,
  drillId: string
) => Promise<Omit<OwnDrill, 'id'> | null>
/** そのコーチ自身のドリル（チャットで送るときに中身を写す）。ほかのコーチのものなら null */
export const findOwnDrill: FindOwnDrill = async (coachUserId, drillId) => {
  const row = await getDb()
    .select(ownDrillColumns)
    .from(drill)
    .where(and(eq(drill.coachUserId, coachUserId), eq(drill.id, drillId)))
    .get()
  if (!row) return null
  const { id: _id, ...own } = toOwnDrill(row)
  return own
}

export type FindOwnDrills = (coachUserId: string, drillIds: string[]) => Promise<OwnDrill[]>
/** そのコーチ自身のドリル（添削におすすめとして添えるときに中身を写す） */
export const findOwnDrills: FindOwnDrills = async (coachUserId, drillIds) => {
  if (drillIds.length === 0) return []
  const rows = await getDb()
    .select(ownDrillColumns)
    .from(drill)
    .where(and(eq(drill.coachUserId, coachUserId), inArray(drill.id, drillIds)))
    .all()
  return rows.map(toOwnDrill)
}
