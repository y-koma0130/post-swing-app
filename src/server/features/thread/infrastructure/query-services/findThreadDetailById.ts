import { mockThreads } from '@/server/mocks/fixtures'
import type { ThreadDetailDto } from '../../application/dto/ThreadDetail.dto'
import { countRemainingStudentMessages } from '../../domain/services/countRemainingStudentMessages.service'

export type FindThreadDetailById = (threadId: string) => Promise<ThreadDetailDto | null>

/**
 * IDでスレッドの詳細を取得
 *
 * MOC: 固定データから返す。段階1で D1 に差し替える
 */
export const findThreadDetailById: FindThreadDetailById = async (threadId) => {
  const thread = mockThreads.find((t) => t.id === threadId)
  if (!thread) {
    return null
  }

  return {
    id: thread.id,
    coachSlug: thread.coachSlug,
    studentName: thread.studentName,
    theme: thread.theme,
    status: thread.status,
    expiresAt: thread.expiresAt,
    videos: thread.videos.map((video) => ({
      id: video.id,
      uploadedAt: video.uploadedAt,
      note: video.note,
      remainingStudentMessages: countRemainingStudentMessages(thread, video.id),
      cards: video.cards,
      messages: thread.messages
        .filter((m) => m.videoId === video.id)
        .map((m) => ({ id: m.id, from: m.from, body: m.body, sentAt: m.sentAt })),
    })),
  }
}
