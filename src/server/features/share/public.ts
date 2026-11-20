import 'server-only'
import { SHARE_RULES } from './domain/rules'
import type { ShareConsentChoices } from './domain/values/ShareConsent'
import { isShareConsentLocked } from './infrastructure/query-services/monitorLock'
import {
  findShareConsent,
  saveShareConsent,
} from './infrastructure/repositories/shareConsentRepository'

/**
 * share がほかの feature に公開する関数（ほかの feature は、share の domain・dto と、このファイルだけを使う）
 */

/**
 * 申し込みのときに生徒が選んだ公開の許可を保存する（thread の最初の提出から呼ぶ。
 * 本人か・18歳以上かは、呼ぶ側で確かめ済み）
 */
export const recordShareConsent = (input: {
  coachUserId: string
  studentUserId: string
  choices: ShareConsentChoices
  now: Date
}) =>
  saveShareConsent({
    ...input.choices,
    coachUserId: input.coachUserId,
    studentUserId: input.studentUserId,
    textVersion: SHARE_RULES.consentTextVersion,
    updatedAt: input.now,
  })

/** コーチと生徒の組の公開の許可（選んでいなければ null。purchase がモニターの条件を確かめる） */
/** モニターで申し込んだコーチか（生徒は公開をやめられない。thread の最初の提出と、添削画面の表示で使う） */
export { findShareConsent, isShareConsentLocked }
