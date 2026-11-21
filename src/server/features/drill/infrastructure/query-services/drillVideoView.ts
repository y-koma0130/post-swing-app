import 'server-only'
import type { DrillVideoDto } from '../../application/dto/Drill.dto'
import type { DrillVideo } from '../../domain/values/DrillVideo'

export type ToDrillVideoDto = (video: DrillVideo | null) => DrillVideoDto | null

/** お手本の動画を、画面で再生する形にする（ドリル一覧・添削・チャットで同じ形） */
export const toDrillVideoDto: ToDrillVideoDto = (video) => {
  if (video === null) return null
  return video.kind === 'upload'
    ? { kind: 'upload', url: `/api/drill-videos/${video.videoId}` }
    : { kind: 'youtube', youtubeId: video.youtubeId, startSec: video.startSec }
}
