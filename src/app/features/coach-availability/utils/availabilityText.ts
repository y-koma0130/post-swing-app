/**
 * コーチの不在・返信遅れを伝える文言（画面のどこでも同じ言い方にする。DOM に依存しない）
 *
 * 日付は日本時間の YYYY-MM-DD で受け取り、「11/24」の形で出す
 */

/** 2026-11-24 → 11/24 */
export const formatShortDate = (date: string): string => {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

/** 2026-11-23 → 2026-11-24（文字列のまま1日足す） */
export const nextDate = (date: string): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const coach = (name: string): string => `${name}コーチ`

type Absent = Readonly<{ endDate: string; resumeDate: string; note: string }>

/** 「山田コーチは11/23まで不在です。返信は11/24以降になります（試合のため）」 */
export const absentMessage = (coachName: string, absence: Absent): string =>
  `${coach(coachName)}は${formatShortDate(absence.endDate)}まで不在です。返信は${formatShortDate(
    absence.resumeDate
  )}以降になります${absence.note ? `（${absence.note}）` : ''}`

/** 入力欄の上の一行・コーチのホームの帯 */
export const absentShort = (coachName: string, endDate: string): string =>
  `${coach(coachName)}は${formatShortDate(endDate)}まで不在です`

export const delayedMessage = (coachName: string): string =>
  `${coach(coachName)}は現在、返信が遅れる場合があります`

export const replyTargetMessage = (hours: number): string => `通常${hours}時間以内に添削が届きます`

/** 「11/20〜11/23は不在の予定です」 */
export const upcomingMessage = (
  absence: Readonly<{ startDate: string; endDate: string }>
): string =>
  `${formatShortDate(absence.startDate)}〜${formatShortDate(absence.endDate)}は不在の予定です`

/** 受付を止めているとき「11/24から受付を再開します」 */
export const pausedMessage = (resumeDate: string): string =>
  `${formatShortDate(resumeDate)}から受付を再開します`

/** 申し込みの了承チェック */
export const signupAckLabel = (resumeDate: string | null): string =>
  resumeDate
    ? `返信が${formatShortDate(resumeDate)}以降になることを了承しました`
    : '返信が遅れる場合があることを了承しました'

/** 送る前の確認ダイアログ */
export const confirmSendMessage = (
  what: 'video' | 'chat',
  coachName: string,
  availability:
    | Readonly<{ kind: 'absent'; endDate: string; resumeDate: string }>
    | Readonly<{ kind: 'delayed' }>
): string => {
  if (availability.kind === 'delayed') return `${delayedMessage(coachName)}。送りますか？`
  const reply = what === 'video' ? '添削' : '返信'
  return `${coach(coachName)}は${formatShortDate(availability.endDate)}まで不在です。${reply}は${formatShortDate(
    availability.resumeDate
  )}以降になります。送りますか？`
}

/** スレッドに入るシステムメッセージ */
export const absenceNoticeMessage = (coachName: string, endDate: string): string =>
  `${coach(coachName)}は${formatShortDate(endDate)}まで不在です。戻り次第返信します`

/** コーチの設定画面のプレビュー */
export const absencePreview = (
  coachName: string,
  absence: Readonly<{ startDate: string; endDate: string }>
): string =>
  `生徒には「${coach(coachName)}は${formatShortDate(absence.startDate)}〜${formatShortDate(
    absence.endDate
  )}不在です。返信は${formatShortDate(nextDate(absence.endDate))}以降になります」と表示されます`

/** 期限の延長 「（不在のため4日延長）」 */
export const extensionNote = (days: number): string =>
  days > 0 ? `（不在のため${days}日延長）` : ''
