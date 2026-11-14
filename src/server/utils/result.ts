/**
 * ユースケースの戻り値。失敗は例外ではなく値で返し、呼び出し側で漏れなく扱わせる
 */
export type Result<T, E extends string> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: E }>

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E extends string>(error: E): Result<never, E> => ({ ok: false, error })
