import 'server-only'
import { logWarn } from '@/server/utils/logger'
import type { YoutubeVideoId } from '../../domain/values/DrillVideo'

export type YoutubeEmbedStatus = 'playable' | 'unavailable' | 'unknown'

export type CheckYoutubeEmbed = (youtubeId: YoutubeVideoId) => Promise<YoutubeEmbedStatus>

/**
 * YouTube の動画を埋め込みで再生できるかを、YouTube の oEmbed に問い合わせる（API キーは要らない）
 *
 * - 200：再生できる
 * - 400・401・403・404：存在しない・非公開・削除済み・埋め込みを許可していない
 *   （ID の形は確かめてから問い合わせるので、400 は存在しない動画のとき）
 * - それ以外（YouTube の障害・通信の失敗）：分からない。登録は止めない
 */
export const checkYoutubeEmbed: CheckYoutubeEmbed = async (youtubeId) => {
  const target = `https://www.youtube.com/watch?v=${youtubeId}`
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target)}`
    )
    if (response.ok) return 'playable'
    if ([400, 401, 403, 404].includes(response.status)) return 'unavailable'
    logWarn('drill', 'YouTube の動画を確かめられませんでした', {
      counts: { status: response.status },
    })
    return 'unknown'
  } catch (error) {
    logWarn('drill', 'YouTube の動画を確かめられませんでした', { kind: 'fetch_failed' }, error)
    return 'unknown'
  }
}
