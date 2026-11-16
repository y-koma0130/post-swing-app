import { type CoachSlug, coachSlugSchema } from '../values/CoachSlug'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** 自動で決めるスラッグの長さ（36種の8文字。重なることはまずない） */
export const RANDOM_SLUG_LENGTH = 8

export type GenerateCoachSlug = (randomBytes: Uint8Array) => CoachSlug

/**
 * コーチがスラッグを決めなかったときに使う、ランダムな文字列
 *
 * ドメインルール:
 * - スラッグの形（英小文字・数字の3〜30文字）に合う8文字
 * - 乱数は呼び出し側から受け取る（テストで決められるように）
 */
export const generateCoachSlug: GenerateCoachSlug = (randomBytes) =>
  coachSlugSchema.parse(
    Array.from(
      randomBytes.subarray(0, RANDOM_SLUG_LENGTH),
      (byte) => ALPHABET[byte % ALPHABET.length]
    ).join('')
  )
