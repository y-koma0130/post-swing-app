import type { CloudflareOptions, ErrorEvent } from '@sentry/cloudflare'
import { cronTriggersIntegration } from '@sentry/cloudflare'

/**
 * Sentry（想定外の障害を運営に知らせる）の設定。src/worker.ts の withSentry に渡す
 *
 * - SENTRY_DSN がない環境（開発中）では送らない
 * - 個人情報は送らない（dataCollection で集めないうえ、送る前にもリクエスト・利用者の項目を消す）
 * - 性能の計測（トレース）は使わない。エラーと Cron の死活監視だけ
 */

/** 定期処理ごとの、Sentry の Cron モニターの名前（キーは cloudflare.config.ts の triggers と同じ値） */
const MONITOR_SLUGS: Readonly<Record<string, string>> = {
  '0 19 * * *': 'daily-maintenance',
  '0 0 * * *': 'morning',
}

/** 送る前に、個人情報が混ざりうる項目を消す */
export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  const { request, ...rest } = event
  const scrubbed: ErrorEvent = { ...rest }
  delete scrubbed.user
  if (request) {
    scrubbed.request = {
      ...(request.method === undefined ? {} : { method: request.method }),
      // クエリ（ログインのトークンなど）を落とした URL だけ残す
      ...(request.url === undefined ? {} : { url: request.url.replace(/[?#].*$/, '') }),
    }
  }
  return scrubbed
}

type SentryEnv = Readonly<{ SENTRY_DSN?: string; APP_ENV: string }>

export const sentryOptions = (env: SentryEnv): CloudflareOptions | undefined => {
  if (!env.SENTRY_DSN) return undefined
  return {
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    // 利用者・Cookie・ヘッダー・本文・クエリ・DB の値・キューの中身・ローカル変数を集めない
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
    integrations: [
      cronTriggersIntegration({
        monitorSlug: (cron) => {
          const slug = MONITOR_SLUGS[cron]
          // 実行が30分遅れたら「動かなかった」、10分を超えたら「終わらなかった」と知らせる
          return slug === undefined
            ? undefined
            : { monitorSlug: slug, checkinMargin: 30, maxRuntime: 10 }
        },
      }),
    ],
    // 画面の操作の記録（breadcrumbs）は、URL や console の中身が混ざるので送らない
    beforeBreadcrumb: () => null,
    beforeSend: scrubEvent,
  }
}
