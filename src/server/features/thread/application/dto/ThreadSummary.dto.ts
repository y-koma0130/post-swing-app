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
  /**
   * 添削の返事の目安（いちばん古い、まだ添削していない提出への）。
   * 添削待ちでない・撮り直しを待っている（期限が止まっている）なら null
   */
  replyDueAt: Date | null
  /** コーチが撮り直しをお願いしていて、まだ届いていない */
  retakeOpen: boolean
  /** 終わった・断られた時刻（終わっていなければ null） */
  finishedAt: Date | null
  /** 終わったレッスンで、生徒がまだレビューを書いていない */
  needsReview: boolean
}

/**
 * レッスンの一覧（コーチのホーム・生徒のマイページ）。進行中は全部、終わったもの（完了・お断り）は
 * 新しい順に決まった数だけ返す（増え続けるので、画面の「もっと見る」で数を増やして読み直す）
 */
export type ThreadSummaryPageDto = {
  /** 終わっていないもの（下書き・承認待ち・添削待ち・レッスン中） */
  active: ThreadSummaryDto[]
  /** 終わったもの（終わった新しい順。finishedLimit 件まで） */
  finished: ThreadSummaryDto[]
  /** 終わったものの合計 */
  finishedTotal: number
}
