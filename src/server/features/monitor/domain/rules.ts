import type { PurchaseStatus } from '@/server/features/purchase/domain/values/Purchase'

/** モニター募集（プロモーションコード）のルール（あとで見直せるように、ここに置く） */
export const MONITOR_RULES = {
  /** コードの長さ */
  codeLength: 8,
  /** コードに使う文字（読み間違えやすい 0・O・1・I・L は使わない） */
  codeAlphabet: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  /** 1人のコーチが受付中にしておけるコードの数 */
  maxActiveCodes: 5,
  /** 1つのコードの人数の上限 */
  maxUsesPerCode: 50,
  /** 呼び名の長さ */
  labelMaxLength: 20,
  /** 割引の最低価格（Stripe で払える最低額）。0円（無料）は別に認める */
  minPaidPriceYen: 50,
} as const

/**
 * コードの人数に数える申し込みの状態（申し込み途中・承認待ち・支払い済み）。
 * 断られた・期限が切れた（voided）・下書きのまま消えたものは数えない（枠に戻る）
 */
export const MONITOR_COUNTED_PURCHASE_STATUSES = [
  'pending',
  'authorized',
  'paid',
] as const satisfies PurchaseStatus[]
