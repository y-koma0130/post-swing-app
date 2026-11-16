import { z } from 'zod'

/**
 * スレッドの状態
 * - waiting_coach: コーチの番（新しい動画、または生徒からのチャットがある）
 * - waiting_student: 生徒の番（動画を送る、または練習中）
 * - closed: 完了・期限切れ
 */
export const threadStatusSchema = z.enum(['waiting_coach', 'waiting_student', 'closed'])

export type ThreadStatus = z.infer<typeof threadStatusSchema>
