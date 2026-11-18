import type { GrantState } from '../../domain/services/describeGrant.service'

/** 特典の状態（画面用。日付は日本時間の YYYY-MM-DD） */
export type GrantStateDto =
  | { kind: 'pending' }
  | { kind: 'active'; endDate: string }
  | { kind: 'scheduled'; startDate: string }
  | { kind: 'ended'; endDate: string }
  | { kind: 'revoked' }

export const toGrantStateDto = (state: GrantState): GrantStateDto => state

/** 管理画面のコーチの行に出す特典 */
export type CoachFeeGrantSummaryDto = {
  grantId: string
  campaignName: string
  /** 特典の手数料率（0〜0.1） */
  feeRate: number
  durationDays: number
  state: GrantStateDto
}

/** 招待のときに選べるキャンペーン */
export type GrantableCampaignDto = {
  code: string
  name: string
  /** 残りの枠。上限がなければ null */
  remaining: number | null
}

/** コーチの設定画面に出す、いまの手数料 */
export type CoachFeeStatusDto = {
  /** 今日の手数料率 */
  rate: number
  /** いちばん有利な特典（取り消し・終了したものは除く）。なければ null */
  grant: {
    campaignName: string
    feeRate: number
    durationDays: number
    state: GrantStateDto
  } | null
}
