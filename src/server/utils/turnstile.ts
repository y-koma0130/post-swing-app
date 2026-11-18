import 'server-only'
import { env } from 'cloudflare:workers'
import { z } from 'zod'

/**
 * Cloudflare Turnstile（ボット対策）
 *
 * 開発中でキーがないときは、Cloudflare が公開しているテスト用のキー（いつも通る）を使う。
 * 本番でキーがなければ、確認はいつも失敗する（守りを外したまま公開しない）
 */
const TEST_SITE_KEY = '1x00000000000000000000AA'
const TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'

/** フォームの部品に渡す、公開してよいキー */
export const getTurnstileSiteKey = (): string =>
  env.TURNSTILE_SITE_KEY || (import.meta.env.DEV ? TEST_SITE_KEY : '')

export const getTurnstileSecretKey = (): string =>
  env.TURNSTILE_SECRET_KEY || (import.meta.env.DEV ? TEST_SECRET_KEY : '')

/** 本物のキーのときだけ、発行先のドメインと用途（action）まで確かめる（テスト用のキーはどちらも返さない） */
export const usesRealTurnstileKeys = (): boolean => Boolean(env.TURNSTILE_SECRET_KEY)

/** トークンを発行してよいドメイン（APP_URL のホスト） */
export const turnstileHostname = (): string => new URL(env.APP_URL || 'http://localhost').hostname

/** 部品ごとの用途。トークンを別の用途に使い回されないようにする */
export const TURNSTILE_ACTIONS = { loginCode: 'login-code', checkout: 'checkout' } as const
export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS]

const siteverifySchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
})

export type VerifyTurnstile = (
  token: string,
  input: Readonly<{ action: TurnstileAction; remoteIp: string | null }>
) => Promise<boolean>

/** フォームと一緒に届いたトークンを Cloudflare に確かめる。確かめられなければ false */
export const verifyTurnstile: VerifyTurnstile = async (token, { action, remoteIp }) => {
  const secret = getTurnstileSecretKey()
  if (!token || !secret) return false
  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  if (remoteIp) body.append('remoteip', remoteIp)
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
    const result = siteverifySchema.safeParse(await response.json())
    if (!result.success || !result.data.success) return false
    if (!usesRealTurnstileKeys()) return true
    return result.data.hostname === turnstileHostname() && result.data.action === action
  } catch {
    return false
  }
}
