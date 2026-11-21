import { z } from 'zod'

/** YouTube の動画 ID（URL の v= や youtu.be/ の後ろにある11文字） */
export const youtubeVideoIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/)
  .brand<'YoutubeVideoId'>()

export type YoutubeVideoId = z.infer<typeof youtubeVideoIdSchema>

/**
 * ドリルのお手本の動画
 *
 * ドメインルール:
 * - コーチが上げた動画（drill_video）か、コーチの YouTube の動画のどちらか
 * - YouTube の動画はダウンロードせず、YouTube の埋め込みでサービスの中で再生する（規約で置き直せないため）
 * - YouTube の動画は、何秒目から再生するかを持てる（長い解説動画の一部だけを見せる）
 */
export const drillVideoSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('upload'), videoId: z.string().min(1) }),
  z.object({
    kind: z.literal('youtube'),
    youtubeId: youtubeVideoIdSchema,
    startSec: z.number().int().nonnegative(),
  }),
])

export type DrillVideo = z.infer<typeof drillVideoSchema>

/** 保存するときの平たい形（ドリル・添削の写し・チャットの写しで同じ列を持つ） */
export type DrillVideoColumns = {
  uploadVideoId: string | null
  youtubeVideoId: string | null
  youtubeStartSec: number | null
}

export const toDrillVideoColumns = (video: DrillVideo | null): DrillVideoColumns => {
  if (video?.kind === 'upload') {
    return { uploadVideoId: video.videoId, youtubeVideoId: null, youtubeStartSec: null }
  }
  if (video?.kind === 'youtube') {
    return { uploadVideoId: null, youtubeVideoId: video.youtubeId, youtubeStartSec: video.startSec }
  }
  return { uploadVideoId: null, youtubeVideoId: null, youtubeStartSec: null }
}

/** 保存した列から組み立てる。動画のないドリル（動画が必須になる前に登録したもの）なら null */
export const drillVideoFromColumns = (columns: DrillVideoColumns): DrillVideo | null => {
  if (columns.uploadVideoId !== null) {
    return { kind: 'upload', videoId: columns.uploadVideoId }
  }
  if (columns.youtubeVideoId !== null) {
    return drillVideoSchema.parse({
      kind: 'youtube',
      youtubeId: columns.youtubeVideoId,
      startSec: columns.youtubeStartSec ?? 0,
    })
  }
  return null
}
