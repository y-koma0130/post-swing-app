/**
 * ユースケースの戻り値。失敗は例外ではなく値で返し、呼び出し側で漏れなく扱わせる
 */
export type Result<T, E extends string> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: E }>

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E extends string>(error: E): Result<never, E> => ({ ok: false, error })

/**
 * Result を返す関数の、失敗の種類（エラーの文言の表を漏れなく書くために使う）
 *
 * 例：`const MESSAGE = { ... } as const satisfies Record<ErrorOf<typeof saveAbsence>, string>`
 */
export type ErrorOf<F extends (...args: never[]) => Promise<Result<unknown, string>>> =
  Awaited<ReturnType<F>> extends infer R
    ? R extends { ok: false; error: infer E }
      ? E
      : never
    : never
