import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { findApplyPage } from '../infrastructure/query-services/findApplyPage'
import { listMyPurchases } from '../infrastructure/query-services/listMyPurchases'

/** 申し込み画面 */
export const getApplyPage = async (slug: string) => {
  const actor = await getActor()
  return findApplyPage(slug, actor?.userId ?? null)
}

/** 生徒のマイページの申し込み一覧。ログインしていなければ null */
export const getMyPurchases = async () => {
  const actor = await getActor()
  return actor ? listMyPurchases(actor.userId) : null
}
