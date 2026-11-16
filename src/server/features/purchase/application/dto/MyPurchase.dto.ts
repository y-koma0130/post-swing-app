import type { PlanKind } from '@/server/features/coach/domain/values/Plan'

/** 生徒のマイページの申し込み一覧 */
export type MyPurchaseDto = {
  id: string
  coachName: string
  coachSlug: string
  planKind: PlanKind
  priceYen: number
  status: 'paid' | 'canceled'
  /** 月額で、Stripe の画面から解約・カード変更ができる */
  canManage: boolean
}
