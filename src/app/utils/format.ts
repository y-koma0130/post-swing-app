/**
 * 表示用の書式。サービスは日本向けなので、時刻はいつも日本時間で出す
 * （サーバー（UTC）とブラウザで同じ文字にならないと、React のハイドレーションが失敗する）
 */
const TIME_ZONE = 'Asia/Tokyo'

export const formatYen = (value: number): string => `${value.toLocaleString('ja-JP')}円`

export const formatMonthDay = (date: Date): string =>
  date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: TIME_ZONE })

const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
})

/** 11/14 18:49 の形 */
export const formatDateTime = (date: Date): string => dateTimeFormat.format(date)
