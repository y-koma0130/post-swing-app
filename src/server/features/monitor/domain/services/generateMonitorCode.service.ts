import { MONITOR_RULES } from '../rules'

export type GenerateMonitorCode = (randomBytes: Uint8Array) => string

/**
 * ランダムなバイト列から、コードを作る（乱数は呼ぶ側で用意する。テストで同じ値を作れるように）
 *
 * ドメインルール:
 * - 8文字。読み間違えやすい文字（0・O・1・I・L）は使わない
 */
export const generateMonitorCode: GenerateMonitorCode = (randomBytes) => {
  const alphabet = MONITOR_RULES.codeAlphabet
  return Array.from(randomBytes.slice(0, MONITOR_RULES.codeLength))
    .map((byte) => alphabet[byte % alphabet.length])
    .join('')
}
