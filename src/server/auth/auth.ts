import 'server-only'
import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins/email-otp'
import { getDb } from '@/server/db/client'
import * as schema from '@/server/db/schema'
import { sendLoginCodeEmail } from './sendLoginCodeEmail'

/** LINE ではメールアドレスを取らない。Better Auth は user にメールを必須とするので、届かない仮のアドレスを入れる */
const lineUserEmail = (lineUserId: string): string => `line_${lineUserId}@users.swingpost.invalid`

/** ログイン時に公式アカウントの友だち追加を促す（友だちでないと通知を送れない） */
const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize?bot_prompt=aggressive'

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
    rateLimit: {
      enabled: true,
      storage: 'database',
      customRules: {
        // 同じ人からのコード送信は1分に1回まで
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
