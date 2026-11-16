import 'server-only'
import { and, eq, gt, inArray, max } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { chatMessage, reply, submission, thread, threadRead } from '@/server/db/schema'

/** どちら側の出来事か（coach：添削・コーチのチャット、student：提出・生徒のチャット） */
export type ActivitySide = 'coach' | 'student'

const later = (a: Date | null | undefined, b: Date | null | undefined): Date | null => {
  if (!a) return b ?? null
  if (!b) return a
  return a.getTime() >= b.getTime() ? a : b
}

/** スレッドごとの、その側のいちばん新しい出来事の時刻 */
export const findLatestActivityByThread = async (
  threadIds: string[],
  side: ActivitySide
): Promise<Map<string, Date>> => {
  if (threadIds.length === 0) return new Map()
  const db = getDb()
  const [chats, works] = await Promise.all([
    db
      .select({ threadId: chatMessage.threadId, at: max(chatMessage.sentAt) })
      .from(chatMessage)
      .where(and(inArray(chatMessage.threadId, threadIds), eq(chatMessage.senderRole, side)))
      .groupBy(chatMessage.threadId)
      .all(),
    side === 'student'
      ? db
          .select({ threadId: submission.threadId, at: max(submission.submittedAt) })
          .from(submission)
          .where(inArray(submission.threadId, threadIds))
          .groupBy(submission.threadId)
          .all()
      : db
          .select({ threadId: submission.threadId, at: max(reply.sentAt) })
          .from(reply)
          .innerJoin(submission, eq(submission.id, reply.submissionId))
          .where(inArray(submission.threadId, threadIds))
          .groupBy(submission.threadId)
          .all(),
  ])
  const result = new Map<string, Date>()
  for (const row of [...chats, ...works]) {
    const at = later(result.get(row.threadId), row.at)
    if (at) result.set(row.threadId, at)
  }
  return result
}

/** スレッドごとの、その人が最後に開いた時刻 */
export const findReadTimes = async (
  threadIds: string[],
  userId: string
): Promise<Map<string, Date>> => {
  if (threadIds.length === 0) return new Map()
  const rows = await getDb()
    .select({ threadId: threadRead.threadId, lastReadAt: threadRead.lastReadAt })
    .from(threadRead)
    .where(and(inArray(threadRead.threadId, threadIds), eq(threadRead.userId, userId)))
    .all()
  return new Map(rows.map((r) => [r.threadId, r.lastReadAt]))
}

export type ThreadActivityFacts = Readonly<{
  lastReadAt: Date | null
  latestSenderActivityAt: Date | null
  unseen: Readonly<{ submissions: number; replies: number; messages: number }>
}>

/**
 * 通知を受け取る人から見た、スレッドのやりとりの様子（通知をまとめるのに使う）。
 * recipient：受け取る人の側。送った側はその反対
 */
export const findThreadActivityFacts = async (
  threadId: string,
  recipient: ActivitySide
): Promise<ThreadActivityFacts | null> => {
  const db = getDb()
  const members = await db
    .select({ coachUserId: thread.coachUserId, studentUserId: thread.studentUserId })
    .from(thread)
    .where(eq(thread.id, threadId))
    .get()
  if (!members) return null
  const recipientUserId = recipient === 'coach' ? members.coachUserId : members.studentUserId
  const sender: ActivitySide = recipient === 'coach' ? 'student' : 'coach'
  const [reads, latest] = await Promise.all([
    findReadTimes([threadId], recipientUserId),
    findLatestActivityByThread([threadId], sender),
  ])
  const lastReadAt = reads.get(threadId) ?? null
  const since = lastReadAt ?? new Date(0)
  const [messages, submissions, replies] = await Promise.all([
    db
      .select({ id: chatMessage.id })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.threadId, threadId),
          eq(chatMessage.senderRole, sender),
          gt(chatMessage.sentAt, since)
        )
      )
      .all(),
    sender === 'student'
      ? db
          .select({ id: submission.id })
          .from(submission)
          .where(and(eq(submission.threadId, threadId), gt(submission.submittedAt, since)))
          .all()
      : [],
    sender === 'coach'
      ? db
          .select({ id: reply.id })
          .from(reply)
          .innerJoin(submission, eq(submission.id, reply.submissionId))
          .where(and(eq(submission.threadId, threadId), gt(reply.sentAt, since)))
          .all()
      : [],
  ])
  return {
    lastReadAt,
    latestSenderActivityAt: latest.get(threadId) ?? null,
    unseen: { submissions: submissions.length, replies: replies.length, messages: messages.length },
  }
}
