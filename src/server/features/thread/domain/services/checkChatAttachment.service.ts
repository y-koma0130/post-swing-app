import type { DrillVideo, VideoLink } from '@/server/features/drill/domain/values/DrillVideo'
import { err, ok, type Result } from '@/server/utils/result'
import type { ChatAttachment } from '../values/ChatMessage'
import { type DraftVideo, isUnusedDraft } from '../values/Submission'

/** 送る人が選んだ添付（中身はまだ確かめていない） */
export type ChatAttachmentRequest =
  | { kind: 'none' }
  | { kind: 'drill'; drillId: string }
  | { kind: 'video'; videoId: string }
  /** YouTube の動画か Instagram の投稿の URL（どちらかは URL から読む） */
  | { kind: 'link'; url: string }

export type ChatAttachmentBlocker =
  | 'invalid_drill'
  | 'invalid_video'
  | 'invalid_link'
  | 'youtube_unavailable'

export type CheckChatAttachment = (
  input: Readonly<{
    request: ChatAttachmentRequest
    threadId: string
    actorUserId: string
    /** request のドリルのうち、送る人（コーチ）自身のもの。見つからなければ null */
    ownDrill: Readonly<{ title: string; description: string; video: DrillVideo | null }> | null
    /** request の動画。見つからなければ null */
    video: DraftVideo | null
    /** request の URL を読んだ結果（読めなければ null） */
    link: VideoLink | null
    /** link が YouTube の動画なら、埋め込みで再生できるか。それ以外は null */
    youtubeStatus: 'playable' | 'unavailable' | 'unknown' | null
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
  link,
  youtubeStatus,
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
    case 'link':
      if (!link) return err('invalid_link')
      if (link.kind === 'youtube' && youtubeStatus === 'unavailable') {
        return err('youtube_unavailable')
      }
      return ok(link)
  }
}
