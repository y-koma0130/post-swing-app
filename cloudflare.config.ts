import { bindings, defineConfig, defineWorker, triggers } from 'cf/config'

/** 通知（LINE・メール）を送るキュー。送信の失敗を再送するため、直接送らずにここへ積む */
const NOTIFICATION_QUEUE = 'swingpost-notifications'

export default defineConfig({
  worker: defineWorker({
    name: 'swingpost',
    // vinext の fetch を包み、queue・scheduled を足した入口
    entrypoint: './src/worker.ts',
    compatibilityDate: '2026-11-14',
    compatibilityFlags: ['nodejs_compat'],
    assets: {
      htmlHandling: 'none',
      notFoundHandling: 'none',
      runWorkerFirst: ['/*', '!/_next/static/*', '!/*/_next/static/*'],
    },
    triggers: [
      triggers.queue({ name: NOTIFICATION_QUEUE, maxRetries: 5, retryDelay: 60 }),
      // 毎日 4:00（日本時間）。期限切れの処理、リマインド、古い動画の削除
      triggers.scheduled({ schedule: '0 19 * * *' }),
    ],
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: 'swingpost' }),
      MEDIA: bindings.r2({ name: 'swingpost-media' }),
      NOTIFICATIONS: bindings.queue({ name: NOTIFICATION_QUEUE }),
      EMAIL: bindings.sendEmail(),
      // 公開URL（ログインのコールバック、LINE・Stripe からの戻り先に使う）
      APP_URL: bindings.secret(),
      BETTER_AUTH_SECRET: bindings.secret(),
      EMAIL_FROM: bindings.secret(),
      LINE_LOGIN_CHANNEL_ID: bindings.secret(),
      LINE_LOGIN_CHANNEL_SECRET: bindings.secret(),
      // Stripe（本番は live、それ以外は test のキー）
      STRIPE_SECRET_KEY: bindings.secret(),
      STRIPE_WEBHOOK_SECRET: bindings.secret(),
      // 管理画面を守る Cloudflare Access（https://<チーム名>.cloudflareaccess.com と、アプリの AUD）
      ACCESS_TEAM_DOMAIN: bindings.secret(),
      ACCESS_AUD: bindings.secret(),
    },
  }),
})
