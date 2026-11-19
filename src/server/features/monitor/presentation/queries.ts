import 'server-only'
import { getActor } from '@/server/auth/getActor'
import type { MonitorCodeDto } from '../application/dto/MonitorCode.dto'
import { resolveMonitorCode } from '../application/usecases/resolveMonitorCode.usecase'
import {
  countCodeUses,
  findCoachUserIdBySlug,
  findSinglePrice,
  hasMonitorPurchase,
  listMonitorCodes,
} from '../infrastructure/query-services/monitorUsage'
import { findMonitorCodeByText } from '../infrastructure/repositories/monitorCodeRepository'

/** ログイン中のコーチのプロモーションコード（コーチでなければ null）と、1レッスンの通常価格 */
export const getMyMonitorCodes = async (): Promise<{
  codes: MonitorCodeDto[]
  singlePriceYen: number | null
} | null> => {
  const actor = await getActor()
  if (!actor) return null
  const [codes, singlePriceYen] = await Promise.all([
    listMonitorCodes(actor.userId),
    findSinglePrice(actor.userId),
  ])
  return { codes, singlePriceYen }
}

/**
 * 申し込みの画面で、生徒が入れたプロモーションコードを確かめる。
 * ログインしていなければ、生徒ごとの条件（モニターは1回まで）を見ずに確かめる
 */
export const previewMonitorCode = async (coachSlug: string, code: string) => {
  const [actor, coachUserId] = await Promise.all([getActor(), findCoachUserIdBySlug(coachSlug)])
  if (!coachUserId) return null
  return resolveMonitorCode(
    { coachUserId, studentUserId: actor?.userId ?? '', code, now: new Date() },
    {
      findMonitorCodeByText,
      countCodeUses,
      hasMonitorPurchase: async (studentUserId, coachUserId) =>
        studentUserId !== '' && (await hasMonitorPurchase(studentUserId, coachUserId)),
    }
  )
}
