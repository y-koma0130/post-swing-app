import { type AgeRange, isAdultAgeRange } from '@/server/features/thread/domain/values/GolfProfile'
import { err, ok, type Result } from '@/server/utils/result'
import { NO_SHARE_CONSENT, type ShareConsentChoices } from '../values/ShareConsent'

export type ShareConsentBlocker = 'not_adult' | 'monitor_locked'

export type CheckShareConsent = (
  input: Readonly<{
    choices: ShareConsentChoices
    ageRange: AgeRange | null
    /** モニターで申し込んだコーチか（公開をやめられない。isShareConsentLocked） */
    locked: boolean
  }>
) => Result<ShareConsentChoices, ShareConsentBlocker>

/**
 * 生徒が選んだ公開の許可を、保存する形にする
 *
 * ドメインルール:
 * - 18歳未満（または年代が分からない）生徒は、公開を許可できない
 * - 公開しないなら、ほかの項目もすべて「出さない」にそろえる
 * - モニターで申し込んだコーチには、公開をやめられない（割引の条件のため。やめたいときは運営に問い合わせる）。
 *   顔・年代・スコアを出すかは変えられる
 */
export const checkShareConsent: CheckShareConsent = ({ choices, ageRange, locked }) => {
  if (!choices.allowPublish) return locked ? err('monitor_locked') : ok(NO_SHARE_CONSENT)
  if (!isAdultAgeRange(ageRange)) return err('not_adult')
  return ok(choices)
}
