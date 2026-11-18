import type {
  CoachFeeStatusDto,
  GrantStateDto,
} from '@/server/features/campaign/application/dto/CoachFeeGrantSummary.dto'
import { PURCHASE_RULES } from '@/server/features/purchase/domain/rules'

/**
 * 手数料とキャンペーンの特典の文言（管理画面とコーチの設定で同じ言い方にする。DOM に依存しない）
 * 日付は日本時間の YYYY-MM-DD で受け取る
 */

/** 2027-02-18 → 2027年2月18日 */
export const formatLongDate = (date: string): string => {
  const [year, month, day] = date.split('-')
  return `${Number(year)}年${Number(month)}月${Number(day)}日`
}

/** 0.1 → 10%、0.05 → 5% */
export const formatFeeRate = (rate: number): string => `${Math.round(rate * 1000) / 10}%`

/** 特典の状態（管理画面の一覧） */
export const grantStateText = (state: GrantStateDto, durationDays: number): string => {
  switch (state.kind) {
    case 'pending':
      return `未開始（初めての承認から${durationDays}日間）`
    case 'scheduled':
      return `${formatLongDate(state.startDate)}から`
    case 'active':
      return `${formatLongDate(state.endDate)}まで`
    case 'ended':
      return `${formatLongDate(state.endDate)}に終了`
    case 'revoked':
      return '取り消し済み'
  }
}

/** コーチの設定画面に出す、いまの手数料の説明 */
export const coachFeeText = (status: CoachFeeStatusDto): string => {
  const base = `手数料は売上の${formatFeeRate(status.rate)}です`
  const grant = status.grant
  if (grant === null) return `${base}。`
  const discounted = `手数料${formatFeeRate(grant.feeRate)}`
  switch (grant.state.kind) {
    case 'pending':
      return `${base}。最初の生徒の申し込みを承認した日から${grant.durationDays}日間、${discounted}になります（${grant.campaignName}の特典）。`
    case 'scheduled':
      return `${base}。${formatLongDate(grant.state.startDate)}から${grant.durationDays}日間、${discounted}になります。`
    case 'active':
      return `いまは${discounted}です（${formatLongDate(grant.state.endDate)}まで）。そのあとは売上の${formatFeeRate(PURCHASE_RULES.platformFeeRate)}です。`
    case 'ended':
    case 'revoked':
      return `${base}。`
  }
}
