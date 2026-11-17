import { PURCHASE_RULES } from '@/server/features/purchase/domain/rules'

/** システム利用料（円） */
export const SYSTEM_FEE_YEN = PURCHASE_RULES.systemFeeYen

/** プランの近くに出す、システム利用料の説明 */
export const SYSTEM_FEE_NOTE = `このほか、申し込みごとにシステム利用料${SYSTEM_FEE_YEN.toLocaleString('ja-JP')}円（税込）がかかります（月額は毎月）。コーチがお受けできなかったときは請求されません。`
