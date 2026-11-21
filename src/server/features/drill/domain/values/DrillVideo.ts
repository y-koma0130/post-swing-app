import { z } from 'zod'

/** YouTube の動画 ID（URL の v= や youtu.be/ の後ろにある11文字） */
export const youtubeVideoIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/)
  .brand<'YoutubeVideoId'>()

export type YoutubeVideoId = z.infer<typeof youtubeVideoIdSchema>

/** Instagram の投稿の種類（URL の /p/・/reel/・/tv/） */
export const instagramPostKindSchema = z.enum(['p', 'reel', 'tv'])

export type InstagramPostKind = z.infer<typeof instagramPostKindSchema>

/** Instagram の投稿の ID（URL の /reel/ の後ろにある shortcode） */
export const instagramShortcodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{5,40}$/)
  .brand<'InstagramShortcode'>()

export type InstagramShortcode = z.infer<typeof instagramShortcodeSchema>

/**
 * Instagram の投稿
 *
 * ドメインルール:
 * - 埋め込みでは再生せず、Instagram（スマホならアプリ）の投稿を開く。
 *   公式の埋め込みは Instagram の枠ごと出て見づらく、題名や画像を取るには Meta の審査が要るため
 */
export const instagramPostSchema = z.object({
  postKind: instagramPostKindSchema,
  shortcode: instagramShortcodeSchema,
})

export type InstagramPost = z.infer<typeof instagramPostSchema>

/** 投稿を開く URL（スマホに Instagram のアプリがあれば、OS がアプリで開く） */
export const instagramPostUrl = (post: Readonly<{ postKind: string; shortcode: string }>): string =>
  `https://www.instagram.com/${post.postKind}/${post.shortcode}/`

/**
 * YouTube の動画
 *
 * ドメインルール:
 * - ダウンロードせず、YouTube の埋め込みでサービスの中で再生する（規約で置き直せないため）
 * - 何秒目から再生するかを持てる（長い解説動画の一部だけを見せる）
 * - Shorts（縦の動画）かを持つ。縦の枠で見せる（URL の /shorts/ で決める）
 */
export const youtubeVideoSchema = z.object({
  youtubeId: youtubeVideoIdSchema,
  startSec: z.number().int().nonnegative(),
  vertical: z.boolean(),
})

export type YoutubeVideo = z.infer<typeof youtubeVideoSchema>

/**
 * URL で添える動画（YouTube の動画か Instagram の投稿）。誰の投稿でもよい（公開されているもの）
 */
export const videoLinkSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('youtube'), ...youtubeVideoSchema.shape }),
  z.object({ kind: z.literal('instagram'), ...instagramPostSchema.shape }),
])

export type VideoLink = z.infer<typeof videoLinkSchema>

/**
 * ドリルのお手本の動画
 *
 * ドメインルール:
 * - コーチが上げた動画（drill_video）か、URL で添える動画（YouTube の動画・Instagram の投稿）
 */
export const drillVideoSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('upload'), videoId: z.string().min(1) }),
  ...videoLinkSchema.options,
])

export type DrillVideo = z.infer<typeof drillVideoSchema>

/** 保存するときの平たい形（ドリル・添削の写し・チャットの写しで同じ列を持つ） */
export type DrillVideoColumns = {
  uploadVideoId: string | null
  youtubeVideoId: string | null
  youtubeStartSec: number | null
  youtubeVertical: boolean | null
  instagramPostKind: string | null
  instagramShortcode: string | null
}

const EMPTY_COLUMNS: DrillVideoColumns = {
  uploadVideoId: null,
  youtubeVideoId: null,
  youtubeStartSec: null,
  youtubeVertical: null,
  instagramPostKind: null,
  instagramShortcode: null,
}

export const toDrillVideoColumns = (video: DrillVideo | null): DrillVideoColumns => {
  switch (video?.kind) {
    case 'upload':
      return { ...EMPTY_COLUMNS, uploadVideoId: video.videoId }
    case 'youtube':
      return {
        ...EMPTY_COLUMNS,
        youtubeVideoId: video.youtubeId,
        youtubeStartSec: video.startSec,
        youtubeVertical: video.vertical,
      }
    case 'instagram':
      return {
        ...EMPTY_COLUMNS,
        instagramPostKind: video.postKind,
        instagramShortcode: video.shortcode,
      }
    case undefined:
      return EMPTY_COLUMNS
  }
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
      vertical: columns.youtubeVertical ?? false,
    })
  }
  if (columns.instagramShortcode !== null) {
    return drillVideoSchema.parse({
      kind: 'instagram',
      postKind: columns.instagramPostKind,
      shortcode: columns.instagramShortcode,
    })
  }
  return null
}
