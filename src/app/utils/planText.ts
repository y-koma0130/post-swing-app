import type { PlanKind } from '@/server/features/coach/domain/values/Plan'

/** プランの種類の呼び方（申し込み・購入したプラン・運営画面で同じ言い方にする） */
export const PLAN_KIND_LABEL = {
  trial: 'お試し',
  single: '1スレッド',
  monthly: '月額',
} as const satisfies Record<PlanKind, string>
