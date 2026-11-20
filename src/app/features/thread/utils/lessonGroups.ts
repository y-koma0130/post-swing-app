import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'

type Summary = Pick<
  ThreadSummaryDto,
  'status' | 'unread' | 'retakeOpen' | 'replyDueAt' | 'approvalDeadline' | 'expiresAt'
>

const time = (date: Date | null, empty: number): number => date?.getTime() ?? empty

/**
 * 生徒が先に動く順（小さいほど先）。
 * 申し込みの続き → 届いた添削（未読） → 撮り直しのお願い → 届いた添削 → コーチの確認待ち → 添削待ち
 */
const studentRank = (t: Summary): number => {
  if (t.status === 'draft') return 0
  if (t.status === 'waiting_student') return t.unread ? 1 : 3
  if (t.retakeOpen) return 2
  if (t.status === 'requested') return 4
  return 5
}

/**
 * 生徒のマイページの進行中のレッスン：自分が動くものが先。同じなら元の並び（始めた新しい順）。
 * 終わったものはサーバーで別に読む（ThreadSummaryPageDto の finished）
 */
export const sortStudentLessons = <T extends Summary>(active: ReadonlyArray<T>): T[] =>
  active.toSorted((a, b) => studentRank(a) - studentRank(b))

/**
 * コーチが先に動く順（小さいほど先）。
 * 添削待ち（返事の目安があるもの） → 撮り直しを待っている添削待ち → チャットの未読 → そのほか
 */
const coachRank = (t: Summary): number => {
  if (t.status === 'waiting_coach') return t.replyDueAt ? 0 : 1
  return t.unread ? 2 : 3
}

/**
 * コーチのホームの進行中：申し込み（返事の期限が近い順）と、レッスン中（添削待ちは返事の目安が近い順、
 * そのあと未読、残りはレッスンの期限が近い順）に分ける。終わったものはサーバーで別に読む
 */
export const groupCoachLessons = <T extends Summary>(
  active: ReadonlyArray<T>
): { requested: T[]; active: T[] } => ({
  requested: active
    .filter((t) => t.status === 'requested')
    .toSorted(
      (a, b) =>
        time(a.approvalDeadline, Number.MAX_SAFE_INTEGER) -
        time(b.approvalDeadline, Number.MAX_SAFE_INTEGER)
    ),
  active: active
    .filter((t) => t.status === 'waiting_coach' || t.status === 'waiting_student')
    .toSorted(
      (a, b) =>
        coachRank(a) - coachRank(b) ||
        time(a.replyDueAt, Number.MAX_SAFE_INTEGER) - time(b.replyDueAt, Number.MAX_SAFE_INTEGER) ||
        a.expiresAt.getTime() - b.expiresAt.getTime()
    ),
})

const HOUR_MS = 60 * 60 * 1000

/** 返事の目安までの残り（「あと5時間」「2時間超過」）。12時間を切ったら急ぎ */
export const replyDueText = (
  dueAt: Date,
  now: Date
): { text: string; urgency: 'overdue' | 'soon' | 'normal' } => {
  const diff = dueAt.getTime() - now.getTime()
  const hours = Math.floor(Math.abs(diff) / HOUR_MS)
  const span = hours >= 24 ? `${Math.floor(hours / 24)}日` : `${Math.max(hours, 1)}時間`
  if (diff < 0) return { text: `${span}超過`, urgency: 'overdue' }
  return {
    text: hours < 1 ? 'あと1時間以内' : `あと${span}`,
    urgency: diff < 12 * HOUR_MS ? 'soon' : 'normal',
  }
}
