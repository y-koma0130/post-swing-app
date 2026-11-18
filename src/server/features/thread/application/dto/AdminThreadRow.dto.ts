import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

/** 管理画面のスレッド一覧の1行 */
export type AdminThreadRowDto = {
  id: string
  coachName: string
  studentName: string
  planKind: PlanKind
  priceYen: number
  /** 生徒が払ったシステム利用料（返金では一緒に返す） */
  systemFeeYen: number
  status: ThreadStatus
  startedAt: Date
  expiresAt: Date
  /** まだ返信していない動画のうち、いちばん古いものが届いた日時。なければ null */
  oldestUnrepliedAt: Date | null
  refundedAt: Date | null
}
