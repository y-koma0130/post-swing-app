import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { DrillInput } from '../../domain/values/Drill'
import type { DrillVideo, YoutubeVideoId } from '../../domain/values/DrillVideo'

export type NewDrill = Readonly<{
  id: string
  coachUserId: string
  title: string
  description: string
  video: DrillVideo
}>

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  /** そのコーチが上げた動画で、まだどのドリルにも使っていないか */
  isUnusedOwnDrillVideo: (coachUserId: string, videoId: string) => Promise<boolean>
  /** YouTube の動画を埋め込みで再生できるか（分からないときは unknown） */
  checkYoutubeEmbed: (youtubeId: YoutubeVideoId) => Promise<'playable' | 'unavailable' | 'unknown'>
  saveDrill: (drill: NewDrill) => Promise<void>
  generateId: () => string
}>

export type CreateDrillError = 'not_found' | 'invalid_video' | 'youtube_unavailable'

export type CreateDrill = (
  params: Readonly<{ actor: Actor; drill: DrillInput }>,
  dependencies: Dependencies
) => Promise<Result<{ drillId: string }, CreateDrillError>>

/**
 * コーチがドリルを登録する。お手本の動画は、先に上げた自分の動画か、YouTube の動画。
 * YouTube は、非公開・削除済み・埋め込みを許可していない動画を止める（生徒が見られないため）。
 * YouTube に問い合わせられないときは止めない
 */
export const createDrill: CreateDrill = async ({ actor, drill }, deps) => {
  if (!(await deps.isCoach(actor.userId))) {
    return err('not_found')
  }
  let video: DrillVideo
  if (drill.video.kind === 'upload') {
    if (!(await deps.isUnusedOwnDrillVideo(actor.userId, drill.video.videoId))) {
      return err('invalid_video')
    }
    video = drill.video
  } else {
    const { youtubeId, startSec } = drill.video.url
    if ((await deps.checkYoutubeEmbed(youtubeId)) === 'unavailable') {
      return err('youtube_unavailable')
    }
    video = { kind: 'youtube', youtubeId, startSec }
  }
  const id = deps.generateId()
  await deps.saveDrill({
    id,
    coachUserId: actor.userId,
    title: drill.title,
    description: drill.description,
    video,
  })
  return ok({ drillId: id })
}
