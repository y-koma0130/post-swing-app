import type { ThreadStatus } from '../../domain/values/ThreadStatus'

/**
 * コーチのホームに出すスレッド一覧の1行
 */
export type ThreadSummaryDto = {
  id: string
  studentName: string
  theme: string
  status: ThreadStatus
  expiresAt: Date
}
