export const formatYen = (value: number): string => `${value.toLocaleString('ja-JP')}円`

export const formatMonthDay = (date: Date): string =>
  date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' })
