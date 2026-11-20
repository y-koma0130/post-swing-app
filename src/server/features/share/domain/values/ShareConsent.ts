import { z } from 'zod'

/**
 * 生徒が選ぶ、添削の公開の許可
 *
 * - allowPublish：添削をコーチの SNS で紹介してよい（false なら、ほかの項目は使わない）
 * - showFace：顔をそのまま出してよい（false なら、顔をぼかした画像だけ）
 * - showAgeRange・showScore：画像に年代・平均スコアを出してよい（名前はどの場合も出さない）
 */
export const shareConsentChoicesSchema = z.object({
  allowPublish: z.boolean(),
  showFace: z.boolean(),
  showAgeRange: z.boolean(),
  showScore: z.boolean(),
})

export type ShareConsentChoices = z.infer<typeof shareConsentChoicesSchema>

/** 公開しない（選んでいないときも、これと同じ扱い） */
export const NO_SHARE_CONSENT: ShareConsentChoices = {
  allowPublish: false,
  showFace: false,
  showAgeRange: false,
  showScore: false,
}

/** フォームのチェックボックス（付いていれば 'on'）から読む */
export const parseShareConsentForm = (
  input: Readonly<Record<keyof ShareConsentChoices, string>>
): ShareConsentChoices => ({
  allowPublish: input.allowPublish === 'on',
  showFace: input.showFace === 'on',
  showAgeRange: input.showAgeRange === 'on',
  showScore: input.showScore === 'on',
})

/** 保存してある許可（コーチと生徒の組ごとに1つ） */
export type ShareConsent = ShareConsentChoices &
  Readonly<{
    coachUserId: string
    studentUserId: string
    textVersion: string
    updatedAt: Date
  }>
