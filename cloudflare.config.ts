import { bindings, defineConfig, defineWorker, triggers } from 'cf/config'

/**
 * 環境ごとに Worker・D1・R2・キューを分ける
 * - production: `pnpm deploy:production`（mode は production）
 * - staging: `pnpm deploy:staging`（mode は staging）。本番と同じ形で、テスト用のキー（Stripe のテストモードなど）を入れる
 * - 開発: `pnpm dev`（mode は development）。リソースはローカルの再現なので名前は本番と同じでよい
 */
const suffixFor = (mode: string | undefined): string => (mode === 'staging' ? '-staging' : '')

/** 定期処理の時刻（UTC）。src/worker.ts で、どちらの処理かを見分ける */
export const DAILY_MAINTENANCE_CRON = '0 19 * * *'
export const MORNING_CRON = '0 0 * * *'

/** 公開する URL。staging はサブドメインに分ける */
const DOMAIN = 'swingpost.app'
const hostnameFor = (mode: string | undefined): string =>
  mode === 'staging' ? `staging.${DOMAIN}` : DOMAIN

export default defineConfig({
  worker: defineWorker((ctx) => {
    const suffix = suffixFor(ctx.mode)
    /** 通知（LINE・メール）を送るキュー。送信の失敗を再送するため、直接送らずにここへ積む */
    const notificationQueue = `swingpost-notifications${suffix}`

    return {
      name: `swingpost${suffix}`,
      // vinext の fetch を包み、queue・scheduled を足した入口
      entrypoint: './src/worker.ts',
      compatibilityDate: '2026-11-14',
      compatibilityFlags: ['nodejs_compat'],
      // ログ（console.error など）を Cloudflare に残し、ダッシュボードで後から探せるようにする。
      // URL のクエリ（ログインのトークンなど）は残さない
      observability: {
        enabled: true,
        redactQueryString: true,
        logs: { enabled: true, invocationLogs: true },
      },
      // 開発（mode が development）では使われない
      domains: [hostnameFor(ctx.mode)],
      assets: {
        htmlHandling: 'none',
        notFoundHandling: 'none',
        runWorkerFirst: ['/*', '!/_next/static/*', '!/*/_next/static/*'],
      },
      triggers: [
        triggers.queue({ name: notificationQueue, maxRetries: 5, retryDelay: 60 }),
        // 毎日 4:00（日本時間）。期限切れの処理、リマインド、古い動画の削除、キャンセル待ちへの連絡
        triggers.scheduled({ schedule: DAILY_MAINTENANCE_CRON }),
        // 毎日 9:00（日本時間）。不在が明けたコーチに、不在中に届いた件数を知らせる
        triggers.scheduled({ schedule: MORNING_CRON }),
      ],
      env: {
        ASSETS: bindings.assets(),
        DB: bindings.d1({ name: `swingpost${suffix}` }),
        MEDIA: bindings.r2({ name: `swingpost-media${suffix}` }),
        NOTIFICATIONS: bindings.queue({ name: notificationQueue }),
        EMAIL: bindings.sendEmail(),
        // 公開URL（ログインのコールバック、LINE・Stripe からの戻り先に使う）
        APP_URL: bindings.secret(),
        BETTER_AUTH_SECRET: bindings.secret(),
        EMAIL_FROM: bindings.secret(),
        LINE_LOGIN_CHANNEL_ID: bindings.secret(),
        LINE_LOGIN_CHANNEL_SECRET: bindings.secret(),
        // LINE 公式アカウント（Messaging API）。通知の送信と、友だち追加の記録に使う
        LINE_MESSAGING_CHANNEL_SECRET: bindings.secret(),
        LINE_MESSAGING_ACCESS_TOKEN: bindings.secret(),
        // 公式アカウントの友だち追加URL（https://line.me/R/ti/p/@…）。友だちでない生徒に案内する
        LINE_ADD_FRIEND_URL: bindings.secret(),
        // Stripe（本番は live、それ以外は test のキー）
        STRIPE_SECRET_KEY: bindings.secret(),
        STRIPE_WEBHOOK_SECRET: bindings.secret(),
        // Connect（コーチの口座）のイベント用のエンドポイントの署名シークレット
        STRIPE_CONNECT_WEBHOOK_SECRET: bindings.secret(),
        // 管理画面を守る Cloudflare Access（https://<チーム名>.cloudflareaccess.com と、アプリの AUD）
        ACCESS_TEAM_DOMAIN: bindings.secret(),
        ACCESS_AUD: bindings.secret(),
        // ボット対策の Cloudflare Turnstile（ログインコードの送信と申し込み）。サイトキーは公開してよい値
        TURNSTILE_SITE_KEY: bindings.secret(),
        TURNSTILE_SECRET_KEY: bindings.secret(),
      },
    }
  }),
})
