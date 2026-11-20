import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  isDemoEnabled: boolean
  generateToken: () => string
  hashToken: (token: string) => Promise<string>
  /** デモのコーチでなければ false（何も変えない） */
  saveDemoTokenHash: (coachUserId: string, tokenHash: string) => Promise<boolean>
}>

export type ReissueDemoLink = (
  params: Readonly<{ coachUserId: string }>,
  dependencies: Dependencies
) => Promise<Result<{ token: string }, 'not_enabled' | 'not_demo'>>

/**
 * デモ用のリンクを作り直す（管理者だけ）。トークンはハッシュでしか持たないので、
 * リンクをもう一度見たいときも作り直す。前のリンクは使えなくなる
 */
export const reissueDemoLink: ReissueDemoLink = async ({ coachUserId }, deps) => {
  if (!deps.isDemoEnabled) return err('not_enabled')
  const token = deps.generateToken()
  const saved = await deps.saveDemoTokenHash(coachUserId, await deps.hashToken(token))
  return saved ? ok({ token }) : err('not_demo')
}
