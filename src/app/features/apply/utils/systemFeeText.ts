import { PURCHASE_RULES } from '@/server/features/purchase/domain/rules'
import { calcSystemFee } from '@/server/features/purchase/domain/services/calcSystemFee.service'

/** プランの価格に対するシステム利用料（円） */
export const systemFeeFor = (priceYen: number): number => calcSystemFee(priceYen)

const { minYen, rate } = PURCHASE_RULES.systemFee

/** システム利用料の決め方 「価格の5%（最低200円）」 */
export const SYSTEM_FEE_RULE_TEXT = `価格の${Math.round(rate * 100)}%（最低${minYen.toLocaleString('ja-JP')}円・税込）`

/** プランの近くに出す、システム利用料の説明 */
export const SYSTEM_FEE_NOTE = `このほか、申し込みごとにシステム利用料（${SYSTEM_FEE_RULE_TEXT}）がかかります（月額は毎月）。コーチがお受けできなかったときは請求されません。`
