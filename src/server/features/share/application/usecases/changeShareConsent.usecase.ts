import type { AgeRange } from '@/server/features/thread/domain/values/GolfProfile'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { SHARE_RULES } from '../../domain/rules'
import {
  checkShareConsent,
  type ShareConsentBlocker,
} from '../../domain/services/checkShareConsent.service'
import type { ShareConsent, ShareConsentChoices } from '../../domain/values/ShareConsent'

type Dependencies = Readonly<{
  /**
   * この生徒が、このコーチに申し込んだいちばん新しいときの年代。
   * 申し込んだことがなければ null（変えられる許可がない）
   */
  findLatestAgeRange: (
    studentUserId: string,
    coachUserId: string
  ) => Promise<{ ageRange: AgeRange | null } | null>
  /** モニターで申し込んだコーチか（公開をやめられない） */
  isShareConsentLocked: (studentUserId: string, coachUserId: string) => Promise<boolean>
  saveShareConsent: (consent: ShareConsent) => Promise<void>
}>

export type ChangeShareConsentError = 'not_found' | ShareConsentBlocker

export type ChangeShareConsent = (
  params: Readonly<{
    actor: Actor
    coachUserId: string
    choices: ShareConsentChoices
    now: Date
  }>,
  dependencies: Dependencies
) => Promise<Result<ShareConsentChoices, ChangeShareConsentError>>

/**
 * 生徒が、あるコーチへの公開の許可を変える（マイページから。本人の生徒だけ）
 *
 * - 申し込んだことのあるコーチだけ（ほかは not_found）
 * - 18歳未満なら公開を許可できない（年代は、いちばん新しい申し込みのときの値）
 * - モニターで申し込んだコーチには、公開をやめられない（出す項目は変えられる）
 * - 変えたら履歴に残す（saveShareConsent が書く）
 */
export const changeShareConsent: ChangeShareConsent = async (
  { actor, coachUserId, choices, now },
  deps
) => {
  const [latest, locked] = await Promise.all([
    deps.findLatestAgeRange(actor.userId, coachUserId),
    deps.isShareConsentLocked(actor.userId, coachUserId),
  ])
  if (!latest) return err('not_found')
  const checked = checkShareConsent({ choices, ageRange: latest.ageRange, locked })
  if (!checked.ok) return err(checked.error)
  await deps.saveShareConsent({
    ...checked.value,
    coachUserId,
    studentUserId: actor.userId,
    textVersion: SHARE_RULES.consentTextVersion,
    updatedAt: now,
  })
  return ok(checked.value)
}
