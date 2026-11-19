import 'server-only'
import { resolveMonitorCode } from './application/usecases/resolveMonitorCode.usecase'
import { countCodeUses, hasMonitorPurchase } from './infrastructure/query-services/monitorUsage'
import { findMonitorCodeByText } from './infrastructure/repositories/monitorCodeRepository'

/**
 * monitor がほかの feature に公開する関数（ほかの feature は、monitor の domain・dto と、このファイルだけを使う）
 */

/** 生徒が入れたプロモコードを、使えるモニター価格に変える（purchase が申し込みを作るときに使う） */
export const resolveMonitorCodeForStudent = (input: {
  coachUserId: string
  studentUserId: string
  code: string
  now: Date
}) => resolveMonitorCode(input, { findMonitorCodeByText, countCodeUses, hasMonitorPurchase })
