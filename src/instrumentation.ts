import { logError } from './server/utils/logger'

/**
 * 画面の表示・Route Handler・Server Action で、捕まえていない例外が起きたとき（vinext が呼ぶ）。
 * ログと Sentry に出す。vinext の既定のログ（例外をそのまま出す）は VINEXT_QUIET で止めている
 */
export const onRequestError = (
  error: unknown,
  request: Readonly<{ path: string; method: string }>,
  context: Readonly<{ routePath: string; routeType: string }>
) => {
  logError('request', '想定外のエラーが起きました', error, {
    // URL ではなくルートの形（/threads/[threadId] など）を出し、ID 以外の値を残さない
    kind: `${request.method} ${context.routePath} (${context.routeType})`,
  })
}
