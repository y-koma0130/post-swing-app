import { err, ok, type Result } from '@/server/utils/result'
import { isDemoActive } from '../../domain/services/demoPeriod.service'

type Dependencies = Readonly<{
  isDemoEnabled: boolean
  hashToken: (token: string) => Promise<string>
  findDemoCoachByTokenHash: (
    tokenHash: string
  ) => Promise<{ userId: string; expiresAt: Date } | null>
}>

export type ResolveDemoLoginError = 'not_enabled' | 'not_found' | 'expired'

export type ResolveDemoLogin = (
  params: Readonly<{ token: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ userId: string }, ResolveDemoLoginError>>

/**
 * デモ用のリンクのトークンから、ログインするデモのコーチを決める
 *
 * ドメインルール:
 * - staging と開発中だけ。デモのコーチ（トークンを持つのはデモだけ）にしか入れない
 * - 期限を過ぎたら入れない
 */
export const resolveDemoLogin: ResolveDemoLogin = async ({ token, now }, deps) => {
  if (!deps.isDemoEnabled) return err('not_enabled')
  if (token === '') return err('not_found')
  const coach = await deps.findDemoCoachByTokenHash(await deps.hashToken(token))
  if (!coach) return err('not_found')
  if (!isDemoActive(coach.expiresAt, now)) return err('expired')
  return ok({ userId: coach.userId })
}
