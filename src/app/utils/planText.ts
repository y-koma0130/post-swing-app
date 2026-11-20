import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import { THREAD_RULES } from '@/server/features/thread/domain/rules'

/** プランの種類の呼び方（申し込み・購入したプラン・運営画面で同じ言い方にする） */
export const PLAN_KIND_LABEL = {
  trial: 'お試し',
  single: '1レッスン',
  monthly: '月額',
} as const satisfies Record<PlanKind, string>

/**
 * プランの中身（受付ページ・申し込み・設定で出す説明）。中身は種類ごとに決まっているので、
 * コーチに書かせず、ルールの値から作る（「提出3回・チャット30通まで・30日間」）
 */
export const planTermsText = (kind: PlanKind): string => {
  const terms = `提出${THREAD_RULES.maxSubmissionsByPlan[kind]}回・チャット${THREAD_RULES.maxStudentMessagesByPlan[kind]}通まで・${THREAD_RULES.durationDays}日間`
  return kind === 'monthly' ? `毎月1レッスン（${terms}）` : terms
}
