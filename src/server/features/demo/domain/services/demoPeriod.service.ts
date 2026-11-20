import { DEMO_RULES } from '../rules'

const DAY_MS = 24 * 60 * 60 * 1000

/** デモの期限（作ってから7日） */
export const calcDemoExpiresAt = (createdAt: Date): Date =>
  new Date(createdAt.getTime() + DEMO_RULES.lifetimeDays * DAY_MS)

/** デモ用のリンクで、まだログインできるか（期限を過ぎたら使えない） */
export const isDemoActive = (expiresAt: Date, now: Date): boolean =>
  expiresAt.getTime() > now.getTime()

/** お手本の動画か（デモを消しても、毎日の処理でも、消さない） */
export const isDemoSampleKey = (r2Key: string): boolean =>
  r2Key.startsWith(DEMO_RULES.sampleKeyPrefix)
