import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { listDrills } from '../infrastructure/repositories/drillRepository'

/** ログイン中のコーチのドリル。ログインしていなければ空 */
export const getMyDrills = async () => {
  const actor = await getActor()
  return actor ? listDrills(actor.userId) : []
}
