import type { PlanKind } from '@/server/features/coach/domain/values/Plan'

/** 生徒のマイページの申し込み一覧 */
export type MyPurchaseDto = {
  id: string
  coachName: string
  coachSlug: string
  coachAvatarUrl: string | null
  planKind: PlanKind
  priceYen: number
  /** システム利用料（以前の申し込みは0） */
  systemFeeYen: number
  status: 'paid' | 'canceled'
  /** 月額で、Stripe の画面から解約・カード変更ができる */
  canManage: boolean
}
