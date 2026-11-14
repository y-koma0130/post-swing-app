/** FormData から文字列を取り出す（ファイルや未入力は空文字） */
export const formString = (formData: FormData, key: string): string => {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/** チェックボックス（チェックされていれば値が送られてくる） */
export const formChecked = (formData: FormData, key: string): boolean => formData.get(key) !== null
