import { type LocalDate, toLocalDate } from '@/server/utils/localDate'
import { err, ok, type Result } from '@/server/utils/result'
import type { MonitorCode } from '../values/MonitorCode'

export type MonitorCodeBlocker = 'code_stopped' | 'code_expired' | 'code_full' | 'already_monitor'

export type CheckMonitorCodeUse = (
  input: Readonly<{
    code: Pick<MonitorCode, 'active' | 'maxUses' | 'expiresOn'>
    /** このコードで申し込んだ数（申し込み途中・承認待ち・レッスン中・終わったもの。断られたものは数えない） */
    usedCount: number
    /** この生徒が、このコーチのモニターになったことがあるか（どのコードでも） */
    alreadyMonitor: boolean
    now: Date
  }>
) => Result<null, MonitorCodeBlocker>

const isPast = (expiresOn: LocalDate | null, now: Date): boolean =>
  expiresOn !== null && toLocalDate(now) > expiresOn

/**
 * 生徒がこのコードで申し込めるか
 *
 * ドメインルール:
 * - コーチが止めていない・期限（日本時間の日付）を過ぎていない・先着の人数に空きがある
 * - 1人がモニターになれるのは、そのコーチで1回まで（どのコードを使っても）
 */
export const checkMonitorCodeUse: CheckMonitorCodeUse = ({
  code,
  usedCount,
  alreadyMonitor,
  now,
}) => {
  if (!code.active) return err('code_stopped')
  if (isPast(code.expiresOn, now)) return err('code_expired')
  if (alreadyMonitor) return err('already_monitor')
  if (usedCount >= code.maxUses) return err('code_full')
  return ok(null)
}
