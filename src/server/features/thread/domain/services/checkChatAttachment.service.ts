import type { ParsedInstagramUrl } from '@/server/features/drill/domain/services/parseInstagramUrl.service'
import type { ParsedYoutubeUrl } from '@/server/features/drill/domain/services/parseYoutubeUrl.service'
import type { DrillVideo } from '@/server/features/drill/domain/values/DrillVideo'
import { err, ok, type Result } from '@/server/utils/result'
import type { ChatAttachment } from '../values/ChatMessage'
import { type DraftVideo, isUnusedDraft } from '../values/Submission'

/** 送る人が選んだ添付（中身はまだ確かめていない） */
export type ChatAttachmentRequest =
  | { kind: 'none' }
  | { kind: 'drill'; drillId: string }
  | { kind: 'video'; videoId: string }
  | { kind: 'youtube'; url: string }
  | { kind: 'instagram'; url: string }

export type ChatAttachmentBlocker =
  | 'invalid_drill'
  | 'invalid_video'
  | 'invalid_youtube'
  | 'youtube_unavailable'
  | 'invalid_instagram'

export type CheckChatAttachment = (
  input: Readonly<{
    request: ChatAttachmentRequest
    threadId: string
    actorUserId: string
    /** request のドリルのうち、送る人（コーチ）自身のもの。見つからなければ null */
    ownDrill: Readonly<{ title: string; description: string; video: DrillVideo | null }> | null
    /** request の動画。見つからなければ null */
    video: DraftVideo | null
    /** request の YouTube の URL を読んだ結果（読めなければ null）と、埋め込みで再生できるか */
    youtube: Readonly<{
      parsed: ParsedYoutubeUrl | null
      status: 'playable' | 'unavailable' | 'unknown' | null
    }> | null
    /** request の Instagram の URL を読んだ結果。読めなければ null */
    instagram: ParsedInstagramUrl | null
  }>
) => Result<ChatAttachment, ChatAttachmentBlocker>

/**
 * チャットに添えるものを受け付けられるか（コーチだけ添えられることは checkChatMessage で確かめる）
 *
 * ドメインルール:
 * - ドリルは、そのコーチ自身のもの。送った時点の中身（お手本の動画も）を写して残す
 * - 動画は、このスレッドに本人が上げて、まだ提出にもチャットにも使っていないもの
 * - YouTube は、動画の URL で、埋め込みで再生できるもの（YouTube に問い合わせられないときは止めない）
 * - Instagram は、投稿かリールの URL（開くリンクなので、投稿があるかは確かめない）
 */
export const checkChatAttachment: CheckChatAttachment = ({
  request,
  threadId,
  actorUserId,
  ownDrill,
  video,
  youtube,
  instagram,
}) => {
  switch (request.kind) {
    case 'none':
      return ok({ kind: 'none' })
    case 'drill':
      return ownDrill ? ok({ kind: 'drill', ...ownDrill }) : err('invalid_drill')
    case 'video':
      return video &&
        video.id === request.videoId &&
        video.threadId === threadId &&
        video.uploaderUserId === actorUserId &&
        isUnusedDraft(video)
        ? ok({ kind: 'video', videoId: video.id })
        : err('invalid_video')
    case 'youtube':
      if (!youtube?.parsed) return err('invalid_youtube')
      if (youtube.status === 'unavailable') return err('youtube_unavailable')
      return ok({ kind: 'youtube', ...youtube.parsed })
    case 'instagram':
      return instagram ? ok({ kind: 'instagram', ...instagram }) : err('invalid_instagram')
  }
}
