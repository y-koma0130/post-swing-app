import 'server-only'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  chatMessage,
  reply,
  replyDrill,
  studentChart,
  studentChartEntry,
  submission,
  thread,
  user,
} from '@/server/db/schema'
import { IN_LESSON_STATUSES } from '@/server/features/thread/domain/rules'
import type { StudentChartDto, StudentListItemDto } from '../../application/dto/StudentChart.dto'

/**
 * カルテの読み取り（スレッド・添削・チャットの表は読むだけ）。
 * 「レッスンがあった」は、申し込みの下書きを除くスレッドがあること
 */

const pairThreads = (coachUserId: string, studentUserId: string) =>
  and(
    eq(thread.coachUserId, coachUserId),
    eq(thread.studentUserId, studentUserId),
    ne(thread.status, 'draft')
  )

export type HasLessonWith = (coachUserId: string, studentUserId: string) => Promise<boolean>
export const hasLessonWith: HasLessonWith = async (coachUserId, studentUserId) =>
  (await getDb()
    .select({ id: thread.id })
    .from(thread)
    .where(pairThreads(coachUserId, studentUserId))
    .get()) !== undefined

export type FindThreadPair = (
  threadId: string
) => Promise<{ coachUserId: string; studentUserId: string } | null>
export const findThreadPair: FindThreadPair = async (threadId) =>
  (await getDb()
    .select({ coachUserId: thread.coachUserId, studentUserId: thread.studentUserId })
    .from(thread)
    .where(and(eq(thread.id, threadId), ne(thread.status, 'draft')))
    .get()) ?? null

export type FindStudentChart = (
  coachUserId: string,
  studentUserId: string
) => Promise<StudentChartDto | null>
export const findStudentChart: FindStudentChart = async (coachUserId, studentUserId) => {
  const db = getDb()
  const [student, chart, entries, threads, replyDrills, chatDrills] = await Promise.all([
    db.select({ name: user.name }).from(user).where(eq(user.id, studentUserId)).get(),
    db
      .select()
      .from(studentChart)
      .where(
        and(
          eq(studentChart.coachUserId, coachUserId),
          eq(studentChart.studentUserId, studentUserId)
        )
      )
      .get(),
    db
      .select({
        id: studentChartEntry.id,
        body: studentChartEntry.body,
        createdAt: studentChartEntry.createdAt,
        threadId: studentChartEntry.threadId,
      })
      .from(studentChartEntry)
      .where(
        and(
          eq(studentChartEntry.coachUserId, coachUserId),
          eq(studentChartEntry.studentUserId, studentUserId)
        )
      )
      .orderBy(desc(studentChartEntry.createdAt))
      .all(),
    db
      .select({
        id: thread.id,
        theme: thread.theme,
        status: thread.status,
        startedAt: thread.startedAt,
      })
      .from(thread)
      .where(pairThreads(coachUserId, studentUserId))
      .orderBy(desc(thread.startedAt))
      .all(),
    db
      .select({ title: replyDrill.title, sentAt: reply.sentAt, threadId: submission.threadId })
      .from(replyDrill)
      .innerJoin(reply, eq(reply.id, replyDrill.replyId))
      .innerJoin(submission, eq(submission.id, reply.submissionId))
      .innerJoin(thread, eq(thread.id, submission.threadId))
      .where(pairThreads(coachUserId, studentUserId))
      .all(),
    db
      .select({
        title: chatMessage.drillTitle,
        sentAt: chatMessage.sentAt,
        threadId: chatMessage.threadId,
      })
      .from(chatMessage)
      .innerJoin(thread, eq(thread.id, chatMessage.threadId))
      .where(and(pairThreads(coachUserId, studentUserId), eq(chatMessage.attachmentKind, 'drill')))
      .all(),
  ])
  if (!student) return null
  const themeOf = (threadId: string | null) => {
    const found = threadId ? threads.find((t) => t.id === threadId) : undefined
    return found ? { id: found.id, theme: found.theme } : null
  }
  return {
    studentUserId,
    studentName: student.name,
    memo: chart?.memo ?? '',
    tags: chart?.tags ?? [],
    updatedAt: chart?.updatedAt ?? null,
    entries: entries.map((e) => ({
      id: e.id,
      body: e.body,
      createdAt: e.createdAt,
      thread: themeOf(e.threadId),
    })),
    threads,
    drills: [...replyDrills, ...chatDrills.map((d) => ({ ...d, title: d.title ?? '' }))].sort(
      (a, b) => b.sentAt.getTime() - a.sentAt.getTime()
    ),
  }
}

export type ListStudents = (coachUserId: string) => Promise<StudentListItemDto[]>
/** そのコーチとレッスンがあった生徒（いちばん最近に動いた順） */
export const listStudents: ListStudents = async (coachUserId) => {
  const db = getDb()
  const [threads, charts] = await Promise.all([
    db
      .select({
        studentUserId: thread.studentUserId,
        name: user.name,
        status: thread.status,
        updatedAt: thread.updatedAt,
      })
      .from(thread)
      .innerJoin(user, eq(user.id, thread.studentUserId))
      .where(and(eq(thread.coachUserId, coachUserId), ne(thread.status, 'draft')))
      .all(),
    db
      .select({ studentUserId: studentChart.studentUserId, tags: studentChart.tags })
      .from(studentChart)
      .where(eq(studentChart.coachUserId, coachUserId))
      .all(),
  ])
  const inLessonStatuses: ReadonlyArray<string> = [...IN_LESSON_STATUSES, 'requested']
  const byStudent = new Map<string, StudentListItemDto>()
  for (const t of threads) {
    const current = byStudent.get(t.studentUserId)
    byStudent.set(t.studentUserId, {
      studentUserId: t.studentUserId,
      name: t.name,
      tags: charts.find((c) => c.studentUserId === t.studentUserId)?.tags ?? [],
      threadCount: (current?.threadCount ?? 0) + 1,
      inLesson: (current?.inLesson ?? false) || inLessonStatuses.includes(t.status),
      lastActivityAt:
        current && current.lastActivityAt > t.updatedAt ? current.lastActivityAt : t.updatedAt,
    })
  }
  return [...byStudent.values()].sort(
    (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime()
  )
}
