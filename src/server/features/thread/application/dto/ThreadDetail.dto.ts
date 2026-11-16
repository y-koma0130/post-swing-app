import type { CoachAvailabilityDto } from '@/server/features/coach/application/dto/CoachAvailability.dto'
import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type { ChatBlocker } from '../../domain/services/checkChatMessage.service'
import type { SubmissionBlocker } from '../../domain/services/checkSubmission.service'
import type { SendGuard } from '../../domain/services/decideSendGuard.service'
import type { Annotation } from '../../domain/values/Annotation'
import type { ChatSender } from '../../domain/values/ChatMessage'
import type { KeyPosition } from '../../domain/values/KeyPosition'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'
import type { VideoAngle } from '../../domain/values/VideoAngle'

/**
 * 添削画面・閲覧ページに出すスレッドの詳細。
 * 提出・チャット・お知らせはそれぞれ時刻順で返し、画面が1本の時系列に並べる
 */
export type ThreadDetailDto = {
  id: string
  coachName: string
  coachSlug: string
  coachAvatarUrl: string | null
  studentName: string
  planKind: PlanKind
  theme: string
  status: ThreadStatus
  startedAt: Date
  /** 実際の期限（コーチの不在の分だけ延びる） */
  expiresAt: Date
  /** 不在のために延びた日数 */
  extendedDays: number
  /** コーチの今の状態（不在・返信遅れ・通常） */
  coachAvailability: CoachAvailabilityDto
  /** 生徒が送る前の確認（提出・チャット） */
  sendGuard: { video: SendGuard; chat: SendGuard }
  limits: {
    /** 提出できる回数 */
    maxSubmissions: number
    /** 1回の提出で送れる動画の本数 */
    maxVideosPerSubmission: number
    /** 動画1本の大きさの上限（バイト） */
    maxVideoBytes: number
    /** 動画1本の長さの上限（秒） */
    maxVideoSeconds: number
    /** 生徒がスレッド全体で送れるチャットの通数 */
    maxStudentMessages: number
  }
  /** 生徒がいま提出できない理由。提出できるなら null */
  submissionBlocker: SubmissionBlocker | null
  /** 生徒があと何通チャットを送れるか */
  remainingStudentMessages: number
  /** 生徒がいまチャットを送れない理由。送れるなら null */
  studentChatBlocker: Extract<ChatBlocker, 'closed' | 'no_submission' | 'limit_reached'> | null
  /** 終わったスレッドへの生徒のレビュー */
  review: {
    rating: number
    comment: string
    coachReply: string | null
  } | null
  submissions: Array<{
    id: string
    submittedAt: Date
    note: string
    videos: Array<{
      id: string
      angle: VideoAngle
      /** 動画の配信URL（権限を確かめてから R2 から返す） */
      url: string
      /** 送るときに測ったフレームレート。分からなければ null（再生画面が推定する） */
      frameRate: number | null
    }>
    reply: {
      sentAt: Date
      cards: Array<{
        id: string
        /** どの動画から作ったカードか */
        videoId: string
        position: KeyPosition
        timeSec: number
        annotations: Annotation[]
        comment: string
        imageUrl: string
        drill: { title: string; description: string } | null
      }>
    } | null
  }>
  messages: Array<{
    id: string
    from: ChatSender
    body: string
    sentAt: Date
  }>
  /** システムメッセージ（不在中に送られたときの「戻り次第返信します」） */
  notices: Array<{
    id: string
    absenceEndDate: string
    createdAt: Date
  }>
}

/** 権限の確認に使う、スレッドの当事者 */
export type ThreadMembers = {
  coachUserId: string
  studentUserId: string
}
