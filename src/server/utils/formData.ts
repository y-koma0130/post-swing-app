/** FormData から文字列を取り出す（ファイルや未入力は空文字） */
export const formString = (formData: FormData, key: string): string => {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/** チェックボックス（チェックされていれば値が送られてくる） */
export const formChecked = (formData: FormData, key: string): boolean => formData.get(key) !== null

/** 数字の入力（未入力・数字でないときは null。チェックはスキーマで行う） */
export const formNumber = (formData: FormData, key: string): number | null => {
  const value = formString(formData, key).trim()
  if (value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
