/**
 * 受付ページを SNS で共有したときに出す文言（ブラウザでもアプリでも使えるよう、DOM に依存しない）
 */

/** 説明文の長さ。SNS のカードで2〜3行に収まる */
const DESCRIPTION_LENGTH = 90

const DEFAULT_DESCRIPTION =
  'スイング動画を送ると、コマ送りと線引きで添削が届きます。LINE で受け取れるオンラインのゴルフレッスンです。'

type CoachForShare = Readonly<{ name: string; title: string; bio: string }>

const collapseSpaces = (text: string): string => text.replace(/\s+/g, ' ').trim()

const truncate = (text: string, length: number): string =>
  [...text].length <= length ? text : `${[...text].slice(0, length - 1).join('')}…`

/** ページのタイトル（例：山田 太郎 のスイング添削） */
export const coachShareTitle = (coach: CoachForShare): string => `${coach.name} のスイング添削`

/** 説明文。紹介文があればその冒頭、なければ肩書きと決まり文句 */
export const coachShareDescription = (coach: CoachForShare): string => {
  const bio = collapseSpaces(coach.bio)
  if (bio !== '') return truncate(bio, DESCRIPTION_LENGTH)
  const title = collapseSpaces(coach.title)
  return title === '' ? DEFAULT_DESCRIPTION : `${title}。${DEFAULT_DESCRIPTION}`
}
