import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

/**
 * スレッド一覧の1行（コーチのホーム・生徒のマイページ）
 */
export type ThreadSummaryDto = {
  id: string
  /** コーチの一覧では生徒の名前、生徒の一覧ではコーチの名前 */
  counterpartName: string
  /** スレッドのコーチ（生徒のコーチ詳細ページで、そのコーチのスレッドだけを出すのに使う） */
  coachSlug: string
  planKind: PlanKind
  theme: string
  status: ThreadStatus
  /** 実際の期限（コーチの不在の分だけ延びる）。申し込みのあいだは仮の値 */
  expiresAt: Date
  /** 承認待ちの申し込みの、コーチが返事をする期限。承認待ちでなければ null */
  approvalDeadline: Date | null
  /** 0円の申し込みか（無料のモニター）。カードも請求もない */
  free: boolean
  /** 見ている人が、まだ見ていない相手の出来事（提出・添削・チャット）があるか */
  unread: boolean
  /** 提出した回数 */
  submissionCount: number
  /** 提出できる回数 */
  maxSubmissions: number
}
