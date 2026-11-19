import type { ShareConsentChoices } from '../../domain/values/ShareConsent'

/** 画面に出す公開の許可（コーチの添削画面・生徒のマイページ）。選んでいなければ null */
export type ShareConsentDto = (ShareConsentChoices & Readonly<{ updatedAt: Date }>) | null
