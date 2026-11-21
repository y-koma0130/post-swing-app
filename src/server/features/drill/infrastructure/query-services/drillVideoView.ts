import 'server-only'
import type { DrillVideoDto } from '../../application/dto/Drill.dto'
import { type DrillVideo, instagramPostUrl } from '../../domain/values/DrillVideo'

export type ToDrillVideoDto = (video: DrillVideo | null) => DrillVideoDto | null

/** お手本の動画を、画面で再生する形にする（ドリル一覧・添削・チャットで同じ形） */
export const toDrillVideoDto: ToDrillVideoDto = (video) => {
  switch (video?.kind) {
    case undefined:
      return null
    case 'upload':
      return { kind: 'upload', url: `/api/drill-videos/${video.videoId}` }
    case 'youtube':
      return { kind: 'youtube', youtubeId: video.youtubeId, startSec: video.startSec }
    case 'instagram':
      return { kind: 'instagram', url: instagramPostUrl(video) }
  }
}
