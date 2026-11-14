import { z } from 'zod'

/**
 * スレッドの状態
 * - waiting_coach: コーチの返信待ち
 * - waiting_student: 生徒の返信待ち
 * - closed: 完了・期限切れ
 */
export const threadStatusSchema = z.enum(['waiting_coach', 'waiting_student', 'closed'])

export type ThreadStatus = z.infer<typeof threadStatusSchema>
