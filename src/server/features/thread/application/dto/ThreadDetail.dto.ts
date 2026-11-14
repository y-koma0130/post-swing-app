import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type { VideoSubmissionBlocker } from '../../domain/services/checkVideoSubmission.service'
import type { Annotation } from '../../domain/values/Annotation'
import type { ChatSender } from '../../domain/values/ChatMessage'
import type { KeyPosition } from '../../domain/values/KeyPosition'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

/**
 * 添削画面・閲覧ページに出すスレッドの詳細
 */
export type ThreadDetailDto = {
  id: string
  coachName: string
  coachSlug: string
  studentName: string
  planKind: PlanKind
  theme: string
  status: ThreadStatus
  startedAt: Date
  expiresAt: Date
  maxVideos: number
  /** 動画1本の大きさの上限（バイト） */
  maxVideoBytes: number
  /** 生徒がいま動画を送れない理由。送れるなら null */
  videoSubmissionBlocker: VideoSubmissionBlocker | null
  /** 終わったスレッドへの生徒のレビュー */
  review: {
    rating: number
    comment: string
    coachReply: string | null
  } | null
  videos: Array<{
    id: string
    uploadedAt: Date
    note: string
    /** 動画の配信URL（権限を確かめてから R2 から返す） */
    url: string
    remainingStudentMessages: number
    reply: {
      sentAt: Date
      cards: Array<{
        id: string
        position: KeyPosition
        timeSec: number
        annotations: Annotation[]
        comment: string
        imageUrl: string
        drill: { title: string; description: string } | null
      }>
    } | null
    messages: Array<{
      id: string
      from: ChatSender
      body: string
      sentAt: Date
    }>
  }>
}

/** 権限の確認に使う、スレッドの当事者 */
export type ThreadMembers = {
  coachUserId: string
  studentUserId: string
}
