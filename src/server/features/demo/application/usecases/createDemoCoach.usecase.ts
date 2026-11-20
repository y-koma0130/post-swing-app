import { err, ok, type Result } from '@/server/utils/result'
import { calcDemoExpiresAt } from '../../domain/services/demoPeriod.service'
import { demoCoachNameSchema } from '../../domain/values/DemoCoachName'

/** デモを作るのに要る値（infrastructure がこれから、デモのコーチとデータを作って書く） */
export type NewDemoCoach = Readonly<{
  coachUserId: string
  coachName: string
  slug: string
  tokenHash: string
  expiresAt: Date
  now: Date
  monitorCode: string
}>

type Dependencies = Readonly<{
  /** デモを作れる環境か（staging と開発中だけ） */
  isDemoEnabled: boolean
  generateId: () => string
  generateToken: () => string
  hashToken: (token: string) => Promise<string>
  generateSlug: () => string
  generateMonitorCode: () => string
  saveDemoCoach: (demo: NewDemoCoach) => Promise<void>
}>

export type CreateDemoCoachError = 'not_enabled' | 'invalid_name'

export type CreateDemoCoach = (
  params: Readonly<{ name: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ coachUserId: string; token: string; expiresAt: Date }, CreateDemoCoachError>>

/**
 * デモのコーチを作る（管理者だけ。権限は呼ぶ側の Server Action で確かめる）
 *
 * ドメインルール:
 * - staging と開発中だけ作れる（本番のデータにデモを混ぜない）
 * - 作るたびに、別々のコーチとデータになる（コーチ候補どうしで影響しない）
 * - 期限は作ってから7日。ログインはデモ用のリンクだけ（トークンはハッシュにして持つ）
 */
export const createDemoCoach: CreateDemoCoach = async ({ name, now }, deps) => {
  if (!deps.isDemoEnabled) return err('not_enabled')
  const coachName = demoCoachNameSchema.safeParse(name)
  if (!coachName.success) return err('invalid_name')

  const coachUserId = deps.generateId()
  const token = deps.generateToken()
  const expiresAt = calcDemoExpiresAt(now)
  await deps.saveDemoCoach({
    coachUserId,
    coachName: coachName.data,
    slug: deps.generateSlug(),
    tokenHash: await deps.hashToken(token),
    expiresAt,
    now,
    monitorCode: deps.generateMonitorCode(),
  })
  return ok({ coachUserId, token, expiresAt })
}
