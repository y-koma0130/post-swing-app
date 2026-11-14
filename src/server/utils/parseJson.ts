/** 外から来た文字列を JSON として読む。読めなければ null（そのあと zod で検証する） */
export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
