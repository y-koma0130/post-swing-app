import { captureException } from '@sentry/core'

/**
 * ログの出し方をそろえる。1行の JSON で出し、Workers Logs で項目ごとに絞り込めるようにする。
 * error だけは Sentry にも送り、運営に知らせる（Sentry を設定していない開発中は送らない）
 *
 * 個人情報を出さないため、渡せる値を型で絞る（docs/auth-and-security.md の「ログ」）
 * - ids：内部の ID と Stripe・キューの ID だけ。名前・メール・LINE のユーザー ID・本文・動画のキーや URL は入れない
 * - counts：件数など数値だけ
 * - kind：通知の種類・Stripe のイベントの種類・止めた理由など、コードで決めた値だけ
 *
 * Next.js・Cloudflare に依存させない（ユースケースからも使うため）。`@sentry/core` は実行環境に依存しない
 */

/** 機能の名前。ログの先頭の `[stripe]` などにあたる */
export type LogScope =
  | 'campaign'
  | 'coach'
  | 'db'
  | 'demo'
  | 'drill'
  | 'notification'
  | 'purchase'
  | 'request'
  | 'scheduled'
  | 'stripe'
  | 'thread'

export type LogFields = Readonly<{
  ids?: Readonly<Record<`${string}Id`, string | null>>
  counts?: Readonly<Record<string, number>>
  kind?: string
}>

type Level = 'info' | 'warn' | 'error'

/** 例外から、ログに出してよい項目だけを取り出す（Stripe のエラーは種類とコードも） */
export const serializeError = (error: unknown): Readonly<Record<string, string>> => {
  if (!(error instanceof Error)) {
    return { name: 'NonError', message: typeof error === 'string' ? error : typeof error }
  }
  const picked: Record<string, string> = { name: error.name, message: error.message }
  if (error.stack) picked['stack'] = error.stack
  for (const key of ['type', 'code', 'statusCode', 'requestId'] as const) {
    const value: unknown = Reflect.get(error, key)
    if (typeof value === 'string' || typeof value === 'number') picked[key] = String(value)
  }
  return picked
}

const write = (level: Level, entry: Readonly<Record<string, unknown>>) => {
  const line = JSON.stringify({ level, ...entry })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

/** 処理の記録（件数など）。運営には知らせない */
export const logInfo = (scope: LogScope, message: string, fields: LogFields = {}) =>
  write('info', { scope, message, ...fields })

/**
 * 気にかけておきたいが、自動で立て直せるもの（再送する、翌日にもう一度など）。運営には知らせない。
 * 立て直せなくなったら logError にする
 */
export const logWarn = (
  scope: LogScope,
  message: string,
  fields: LogFields = {},
  error?: unknown
) =>
  write('warn', {
    scope,
    message,
    ...fields,
    ...(error === undefined ? {} : { error: serializeError(error) }),
  })

/**
 * 想定外の障害。ログに残し、Sentry で運営に知らせる。
 * 利用者のルール違反（申し込みの締め切りなど）は Result で返し、ここには出さない
 */
export const logError = (
  scope: LogScope,
  message: string,
  error: unknown,
  fields: LogFields = {}
) => {
  write('error', { scope, message, ...fields, error: serializeError(error) })
  captureException(error, {
    tags: { scope, ...(fields.kind === undefined ? {} : { kind: fields.kind }) },
    extra: { message, ...fields.ids, ...fields.counts },
  })
}
