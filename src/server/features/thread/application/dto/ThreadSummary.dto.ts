import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

/**
 * スレッド一覧の1行（コーチのホーム・生徒のマイページ）
 */
export type ThreadSummaryDto = {
  id: string
  /** コーチの一覧では生徒の名前、生徒の一覧ではコーチの名前 */
  counterpartName: string
  planKind: PlanKind
  theme: string
  status: ThreadStatus
  /** 実際の期限（コーチの不在の分だけ延びる） */
  expiresAt: Date
  /** 提出した回数 */
  submissionCount: number
  /** 提出できる回数 */
  maxSubmissions: number
}
