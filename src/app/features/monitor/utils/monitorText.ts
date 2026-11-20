import type { MonitorCodeDto } from '@/server/features/monitor/application/dto/MonitorCode.dto'
import { toLocalDate } from '@/server/utils/localDate'

/** コードのいまの様子（受付中・止めている・満員・期限切れ） */
export type MonitorCodeState = 'open' | 'stopped' | 'full' | 'expired'

export const monitorCodeState = (
  code: Pick<MonitorCodeDto, 'active' | 'usedCount' | 'maxUses' | 'expiresOn'>,
  now: Date
): MonitorCodeState => {
  if (!code.active) return 'stopped'
  if (code.expiresOn !== null && toLocalDate(now) > code.expiresOn) return 'expired'
  if (code.usedCount >= code.maxUses) return 'full'
  return 'open'
}

export const MONITOR_CODE_STATE_LABEL = {
  open: '募集中',
  stopped: '止めています',
  full: '満員',
  expired: '期限切れ',
} as const satisfies Record<MonitorCodeState, string>

/** 価格の見せ方（0円は「無料」） */
export const monitorPriceText = (priceYen: number): string =>
  priceYen === 0 ? '無料' : `${priceYen.toLocaleString('ja-JP')}円`

/** コードを入れた状態で開く、申し込みの画面の URL */
export const monitorApplyUrl = (siteUrl: string, coachSlug: string, code: string): string =>
  `${siteUrl}/c/${coachSlug}/apply?code=${code}`
