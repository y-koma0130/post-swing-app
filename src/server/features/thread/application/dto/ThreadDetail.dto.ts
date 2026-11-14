import type { Annotation } from '../../domain/values/Annotation'
import type { ChatSender } from '../../domain/values/ChatMessage'
import type { KeyPosition } from '../../domain/values/KeyPosition'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

/**
 * 添削画面・閲覧ページに出すスレッドの詳細
 */
export type ThreadDetailDto = {
  id: string
  coachSlug: string
  studentName: string
  theme: string
  status: ThreadStatus
  expiresAt: Date
  videos: Array<{
    id: string
    uploadedAt: Date
    note: string
    remainingStudentMessages: number
    cards: Array<{
      id: string
      position: KeyPosition
      timeSec: number
      annotations: Annotation[]
      comment: string
    }>
    messages: Array<{
      id: string
      from: ChatSender
      body: string
      sentAt: Date
    }>
  }>
}
