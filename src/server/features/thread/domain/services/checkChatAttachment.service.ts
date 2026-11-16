import { err, ok, type Result } from '@/server/utils/result'
import type { ChatAttachment } from '../values/ChatMessage'
import { type DraftVideo, isUnusedDraft } from '../values/Submission'

/** 送る人が選んだ添付（中身はまだ確かめていない） */
export type ChatAttachmentRequest =
  | { kind: 'none' }
  | { kind: 'drill'; drillId: string }
  | { kind: 'video'; videoId: string }

export type ChatAttachmentBlocker = 'invalid_drill' | 'invalid_video'

export type CheckChatAttachment = (
  input: Readonly<{
    request: ChatAttachmentRequest
    threadId: string
    actorUserId: string
    /** request のドリルのうち、送る人（コーチ）自身のもの。見つからなければ null */
    ownDrill: Readonly<{ title: string; description: string }> | null
    /** request の動画。見つからなければ null */
    video: DraftVideo | null
  }>
) => Result<ChatAttachment, ChatAttachmentBlocker>

/**
 * チャットに添えるものを受け付けられるか（コーチだけ添えられることは checkChatMessage で確かめる）
 *
 * ドメインルール:
 * - ドリルは、そのコーチ自身のもの。送った時点の中身を写して残す
 * - 動画は、このスレッドに本人が上げて、まだ提出にもチャットにも使っていないもの
 */
export const checkChatAttachment: CheckChatAttachment = ({
  request,
  threadId,
  actorUserId,
  ownDrill,
  video,
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
  }
}
