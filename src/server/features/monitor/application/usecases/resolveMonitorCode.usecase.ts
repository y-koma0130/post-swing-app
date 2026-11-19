import { err, ok, type Result } from '@/server/utils/result'
import { checkMonitorCodeUse } from '../../domain/services/checkMonitorCodeUse.service'
import { type MonitorCode, monitorCodeTextSchema } from '../../domain/values/MonitorCode'
import type { MonitorCodeUse, ResolveMonitorCodeError } from '../dto/MonitorCodeUse.dto'

type Dependencies = Readonly<{
  findMonitorCodeByText: (coachUserId: string, code: string) => Promise<MonitorCode | null>
  countCodeUses: (codeId: string) => Promise<number>
  hasMonitorPurchase: (studentUserId: string, coachUserId: string) => Promise<boolean>
}>

export type ResolveMonitorCode = (
  params: Readonly<{ coachUserId: string; studentUserId: string; code: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<MonitorCodeUse, ResolveMonitorCodeError>>

/**
 * 生徒が入れたプロモーションコードを、使えるモニター価格に変える（申し込みの画面と、申し込みを作るとき）
 *
 * - そのコーチのコードだけ（ほかのコーチのコードは見つからない扱い）
 * - 使えるかは checkMonitorCodeUse で決める
 */
export const resolveMonitorCode: ResolveMonitorCode = async (params, deps) => {
  const text = monitorCodeTextSchema.safeParse(params.code)
  if (!text.success) return err('code_not_found')
  const code = await deps.findMonitorCodeByText(params.coachUserId, text.data)
  if (!code) return err('code_not_found')
  const [usedCount, alreadyMonitor] = await Promise.all([
    deps.countCodeUses(code.id),
    deps.hasMonitorPurchase(params.studentUserId, params.coachUserId),
  ])
  const usable = checkMonitorCodeUse({ code, usedCount, alreadyMonitor, now: params.now })
  if (!usable.ok) return err(usable.error)
  return ok({ codeId: code.id, priceYen: code.priceYen, maxUses: code.maxUses })
}
