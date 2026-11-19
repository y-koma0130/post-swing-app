import { type AgeRange, isAdultAgeRange } from '@/server/features/thread/domain/values/GolfProfile'
import { err, ok, type Result } from '@/server/utils/result'
import { NO_SHARE_CONSENT, type ShareConsentChoices } from '../values/ShareConsent'

export type ShareConsentBlocker = 'not_adult'

export type CheckShareConsent = (
  input: Readonly<{ choices: ShareConsentChoices; ageRange: AgeRange | null }>
) => Result<ShareConsentChoices, ShareConsentBlocker>

/**
 * 生徒が選んだ公開の許可を、保存する形にする
 *
 * ドメインルール:
 * - 18歳未満（または年代が分からない）生徒は、公開を許可できない
 * - 公開しないなら、ほかの項目もすべて「出さない」にそろえる
 */
export const checkShareConsent: CheckShareConsent = ({ choices, ageRange }) => {
  if (!choices.allowPublish) return ok(NO_SHARE_CONSENT)
  if (!isAdultAgeRange(ageRange)) return err('not_adult')
  return ok(choices)
}
