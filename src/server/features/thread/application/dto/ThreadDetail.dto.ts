import type { CoachAvailabilityDto } from '@/server/features/coach/application/dto/CoachAvailability.dto'
import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type { DrillVideoDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { ShareConsentDto } from '@/server/features/share/application/dto/ShareConsent.dto'
import type { ChatBlocker } from '../../domain/services/checkChatMessage.service'
import type { StudentCloseBlocker } from '../../domain/services/checkStudentClose.service'
import type { SubmissionBlocker } from '../../domain/services/checkSubmission.service'
import type { SendGuard } from '../../domain/services/decideSendGuard.service'
import type { Annotation } from '../../domain/values/Annotation'
import type { ChatQuote, ChatSender } from '../../domain/values/ChatMessage'
import type { DeclineReason } from '../../domain/values/DeclineReason'
import type { GolfProfile } from '../../domain/values/GolfProfile'
import type { KeyPosition } from '../../domain/values/KeyPosition'
import type { RetakeCloseReason, RetakeReason } from '../../domain/values/RetakeRequest'
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
  /** 撮り直しのお願い（古い順）と、このスレッドであと何回お願いできるか */
  retake: {
    requests: Array<{
      id: string
      submissionId: string
      reason: RetakeReason
      message: string
      requestedAt: Date
      /** 終わっていなければ null */
      closedAt: Date | null
      closeReason: RetakeCloseReason | null
    }>
    remaining: number
  }
  /** 生徒のラウンドの回数と平均スコア（申し込みのときに任意で書いたもの） */
  golfProfile: GolfProfile
  status: ThreadStatus
  startedAt: Date
  /** 実際の期限（コーチの不在の分だけ延びる） */
  expiresAt: Date
  /** 不在のために延びた日数 */
  extendedDays: number
  /** 申し込み（承認制）の様子 */
  application: {
    /** 承認待ちのとき、コーチが返事をする期限。それ以外は null */
    approvalDeadline: Date | null
    /** 断られたとき、その理由とひとこと。それ以外は null */
    decline: { reason: DeclineReason; message: string } | null
    /** 下書きのとき、申し込みの最終確認に出す金額（申し込んだ時点の値）。それ以外は null */
    checkout: { priceYen: number; systemFeeYen: number } | null
    /** モニターのプロモーションコードでの申し込みか（公開の許可が条件。0円ならカードを登録しない） */
    monitor: boolean
    /** 0円の申し込みか（無料のモニター）。カードも請求もない */
    free: boolean
  }
  /**
   * 生徒が選んだ公開の許可（コーチがシェア画像を作るときに使う）。選んでいなければ null。
   * 名前は、どの場合も出さない
   */
  shareConsent: ShareConsentDto
  /** モニターで申し込んだことのあるコーチか（生徒は公開をやめられない。出す項目は変えられる） */
  shareConsentLocked: boolean
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
  /** 生徒がいま自分でスレッドを終えられない理由。終えられるなら null */
  studentCloseBlocker: StudentCloseBlocker | null
  /** 生徒があと何通チャットを送れるか */
  remainingStudentMessages: number
  /** 生徒がいまチャットを送れない理由。送れるなら null */
  studentChatBlocker: Extract<
    ChatBlocker,
    'closed' | 'not_started' | 'no_submission' | 'limit_reached'
  > | null
  /** それぞれが最後にスレッドを開いた時刻（開く前の値。「ここから新着」の線を引くのに使う） */
  lastReadAt: { coach: Date | null; student: Date | null }
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
      /** 撮り直しのお願いに応えて送った動画か */
      retake: boolean
    }>
    reply: {
      sentAt: Date
      /** 全体の説明（以前の添削では空） */
      comment: string
      /** おすすめのドリル。video はお手本の動画（動画のないドリルなら null） */
      drills: Array<{ title: string; description: string; video: DrillVideoDto | null }>
      /** 画像（キャプチャ）と、それぞれの一言 */
      cards: Array<{
        id: string
        /** どの動画から作ったカードか */
        videoId: string
        position: KeyPosition
        timeSec: number
        annotations: Annotation[]
        comment: string
        imageUrl: string
      }>
    } | null
  }>
  messages: Array<{
    id: string
    from: ChatSender
    body: string
    sentAt: Date
    attachment:
      | { kind: 'none' }
      | { kind: 'drill'; title: string; description: string; video: DrillVideoDto | null }
      | { kind: 'video'; videoId: string; url: string; frameRate: number | null }
      | { kind: 'youtube'; youtubeId: string; startSec: number }
      | { kind: 'instagram'; url: string }
    quote: ChatQuote | null
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
