import 'server-only'
import { resolveDemoLogin } from './application/usecases/resolveDemoLogin.usecase'
import { hashDemoToken, isDemoEnabled } from './infrastructure/external-services/demoEnv'
import {
  findDemoCoachByTokenHash,
  findDemoExpiry,
} from './infrastructure/repositories/demoRepository'

/**
 * demo がほかの feature に公開する関数（ほかの feature は、demo の domain と、このファイルだけを使う）
 */

/** デモのコーチか（通知を送らない・Stripe を呼ばない、などを決める） */
export const isDemoCoach = async (coachUserId: string): Promise<boolean> =>
  (await findDemoExpiry(coachUserId)) !== null

/** デモのコーチの期限（デモでなければ null）。画面の上に「デモです」の帯を出すのに使う */
export const getDemoExpiry = (coachUserId: string): Promise<Date | null> =>
  findDemoExpiry(coachUserId)

/** デモ用のリンクのトークンから、ログインするデモのコーチを決める（auth の入口から呼ぶ） */
export const resolveDemoLoginToken = (token: string) =>
  resolveDemoLogin(
    { token, now: new Date() },
    { isDemoEnabled: isDemoEnabled(), hashToken: hashDemoToken, findDemoCoachByTokenHash }
  )
