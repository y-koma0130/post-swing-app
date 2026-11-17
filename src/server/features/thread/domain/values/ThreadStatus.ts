import { z } from 'zod'

/**
 * スレッドの状態
 * - draft: 申し込みの下書き（生徒が悩みと動画を送り、カードを登録する前）。コーチには見えない
 * - requested: 承認待ち（カードを仮押さえ済み。コーチが受けるか決める）
 * - waiting_coach: コーチの番（新しい動画、または生徒からのチャットがある）
 * - waiting_student: 生徒の番（動画を送る、または練習中）
 * - closed: 完了・期限切れ
 * - declined: コーチが断った（期限までに返事がなかったときも）。請求はしない
 */
export const threadStatusSchema = z.enum([
  'draft',
  'requested',
  'waiting_coach',
  'waiting_student',
  'closed',
  'declined',
])

export type ThreadStatus = z.infer<typeof threadStatusSchema>

/** レッスン中（承認されて、まだ終わっていない） */
export const isInLesson = (status: ThreadStatus): boolean =>
  status === 'waiting_coach' || status === 'waiting_student'

/** もう動かない（終わった・断った） */
export const isFinished = (status: ThreadStatus): boolean =>
  status === 'closed' || status === 'declined'
