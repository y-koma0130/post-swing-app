import { DEMO_RULES } from '../rules'

const DAY_MS = 24 * 60 * 60 * 1000

export type CalcDemoExpiresAt = (createdAt: Date) => Date
/** デモの期限（ドメインルール：作ってから DEMO_RULES.lifetimeDays 日） */
export const calcDemoExpiresAt: CalcDemoExpiresAt = (createdAt) =>
  new Date(createdAt.getTime() + DEMO_RULES.lifetimeDays * DAY_MS)

export type IsDemoActive = (expiresAt: Date, now: Date) => boolean
/** デモ用のリンクで、まだログインできるか（ドメインルール：期限の時刻ちょうどからは使えない） */
export const isDemoActive: IsDemoActive = (expiresAt, now) => expiresAt.getTime() > now.getTime()

export type IsDemoSampleKey = (r2Key: string) => boolean
/** お手本の動画か（ドメインルール：どのデモも使うので、デモを消しても、毎日の処理でも、消さない） */
export const isDemoSampleKey: IsDemoSampleKey = (r2Key) =>
  r2Key.startsWith(DEMO_RULES.sampleKeyPrefix)
