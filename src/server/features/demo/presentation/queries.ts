import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { isDemoEnabled } from '../infrastructure/external-services/demoEnv'
import { findDemoExpiry, listDemoCoaches } from '../infrastructure/repositories/demoRepository'

/** 管理画面のデモの一覧。管理者でなければ null。デモを使えない環境（本番）では空 */
export const getDemoCoachesForAdmin = async () => {
  if (!(await isAdminRequest())) return null
  return isDemoEnabled()
    ? { enabled: true, coaches: await listDemoCoaches() }
    : { enabled: false, coaches: [] }
}

/** ログイン中のコーチがデモなら、その期限（コーチの画面の上に帯を出す）。デモでなければ null */
export const getCurrentDemoExpiry = async (): Promise<Date | null> => {
  const actor = await getActor()
  return actor ? findDemoExpiry(actor.userId) : null
}
