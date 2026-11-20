import 'server-only'
import { env } from 'cloudflare:workers'
import { type BetterAuthPlugin, betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthEndpoint } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import { captcha } from 'better-auth/plugins/captcha'
import { emailOTP } from 'better-auth/plugins/email-otp'
import { z } from 'zod'
import { getDb } from '@/server/db/client'
import * as schema from '@/server/db/schema'
import { resolveDemoLoginToken } from '@/server/features/demo/public'
import {
  getTurnstileSecretKey,
  TURNSTILE_ACTIONS,
  turnstileHostname,
  usesRealTurnstileKeys,
} from '@/server/utils/turnstile'
import { sendLoginCodeEmail } from './sendLoginCodeEmail'

/** LINE ではメールアドレスを取らない。Better Auth は user にメールを必須とするので、届かない仮のアドレスを入れる */
const lineUserEmail = (lineUserId: string): string => `line_${lineUserId}@users.swingpost.invalid`

/** ログイン時に公式アカウントの友だち追加を促す（友だちでないと通知を送れない） */
const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize?bot_prompt=aggressive'

/**
 * デモ用のリンク（/api/auth/demo-login?token=…）。開くと、そのデモのコーチとしてログインし、ホームを開く。
 * 入れるのは staging・開発中の、期限内のデモのコーチだけ（決め方は demo の resolveDemoLogin）。
 * 入れなければ、コーチのログイン画面に理由を付けて戻す
 */
const demoLogin = () =>
  ({
    id: 'demo-login',
    endpoints: {
      demoLogin: createAuthEndpoint(
        '/demo-login',
        { method: 'GET', query: z.object({ token: z.string() }) },
        async (ctx) => {
          const resolved = await resolveDemoLoginToken(ctx.query.token)
          if (!resolved.ok) throw ctx.redirect(`/coach/login?demo=${resolved.error}`)
          const user = await ctx.context.internalAdapter.findUserById(resolved.value.userId)
          if (!user) throw ctx.redirect('/coach/login?demo=not_found')
          const session = await ctx.context.internalAdapter.createSession(user.id)
          await setSessionCookie(ctx, { session, user })
          throw ctx.redirect('/coach')
        }
      ),
    },
  }) satisfies BetterAuthPlugin

const createAuth = () =>
  betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'sqlite', schema }),
    session: {
      // D1 への問い合わせを減らす。無効にしたセッションも最長5分で切れる
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: { encryptOAuthTokens: true },
    advanced: {
      // Cloudflare が付ける接続元IP。回数制限を人ごとに数えるのに使う
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
    },
    rateLimit: {
      // 開発中は1つのIPでいくつものテスト用アカウントを切り替えるので止める（429 になることは確認済み）
      enabled: !import.meta.env.DEV,
      storage: 'database',
      customRules: {
        // コードの送信は、同じIPから1分に1回まで
        '/email-otp/send-verification-otp': { window: 60, max: 1 },
      },
    },
    socialProviders:
      env.LINE_LOGIN_CHANNEL_ID && env.LINE_LOGIN_CHANNEL_SECRET
        ? {
            line: {
              clientId: env.LINE_LOGIN_CHANNEL_ID,
              clientSecret: env.LINE_LOGIN_CHANNEL_SECRET,
              authorizationEndpoint: LINE_AUTHORIZE_URL,
              disableDefaultScope: true,
              scope: ['openid', 'profile'],
              mapProfileToUser: (profile) => ({ email: lineUserEmail(profile.sub) }),
            },
          }
        : {},
    plugins: [
      demoLogin(),
      // ログインコードの送信はボットに叩かれやすい（メールの送信枠と、送信元の評判を守る）
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: getTurnstileSecretKey(),
        endpoints: ['/email-otp/send-verification-otp'],
        ...(usesRealTurnstileKeys()
          ? {
              expectedAction: TURNSTILE_ACTIONS.loginCode,
              allowedHostnames: [turnstileHostname()],
            }
          : {}),
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        // 本番では招待済みのコーチしかメールでログインできない。開発中は誰でも作れる（生徒役の確認用）
        disableSignUp: !import.meta.env.DEV,
        sendVerificationOTP: async ({ email, otp }) => {
          await sendLoginCodeEmail({ to: email, code: otp })
        },
      }),
    ],
  })

let auth: ReturnType<typeof createAuth> | null = null

export const getAuth = () => {
  auth ??= createAuth()
  return auth
}
