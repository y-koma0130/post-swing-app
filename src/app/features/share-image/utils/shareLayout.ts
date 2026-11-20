import { AGE_RANGE_LABEL } from '@/app/utils/threadText'
import type { AgeRange } from '@/server/features/thread/domain/values/GolfProfile'

/** フィード（カルーセル）の大きさ。インスタの縦長（4:5） */
export const FEED_SIZE = { width: 1080, height: 1350 } as const
/** ストーリーズの大きさ（9:16）。下はリンクのスタンプを貼る余白 */
export const STORY_SIZE = { width: 1080, height: 1920 } as const
/** ストーリーズで、下に空けておく高さ（リンクのスタンプ用） */
export const STORY_STICKER_SPACE = 420

/** カルーセルに入れられる枚数（インスタの上限）。表紙・まとめ・最後の3枚を含む */
export const MAX_FEED_SLIDES = 10
/** 添削の画像として選べる枚数（表紙・まとめ・最後を除いた残り） */
export const MAX_CARD_SLIDES = MAX_FEED_SLIDES - 3

/**
 * シェア画像を作る機能を画面に出すか。どんな形で出すかを練り直すあいだは止めておく
 * （止めているあいだは、添削画面のリンクを出さず、作成画面も開けない）
 */
export const SHARE_IMAGE_ENABLED = false

export const DEFAULT_HEADLINE = 'スイング添削してみました'

/** 画像に出す色（アプリの色の名前と同じ値） */
export const SHARE_COLORS = {
  mint: '#3fbf87',
  mintSoft: '#e6f8ef',
  mintText: '#18794e',
  ink: '#0b3d2c',
  body: '#3a3d3c',
  muted: '#626866',
  white: '#ffffff',
} as const

/**
 * 画像に出す生徒の一言（「40代・平均スコア98」）。名前は出さない。
 * 生徒が出してよいと選んだ項目だけ。何もなければ null
 */
export const studentLabel = (
  profile: Readonly<{ ageRange: AgeRange | null; averageScore: number | null }>,
  consent: Readonly<{ showAgeRange: boolean; showScore: boolean }>
): string | null => {
  const parts = [
    consent.showAgeRange && profile.ageRange && profile.ageRange !== 'under_18'
      ? AGE_RANGE_LABEL[profile.ageRange]
      : null,
    consent.showScore && profile.averageScore !== null ? `平均スコア${profile.averageScore}` : null,
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join('・') : null
}

export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>

/** 画像を枠の中に収める（縦横比はそのまま、はみ出さない。真ん中に置く） */
export const fitContain = (
  source: Readonly<{ width: number; height: number }>,
  box: Rect
): Rect => {
  const scale = Math.min(box.width / source.width, box.height / source.height)
  const width = source.width * scale
  const height = source.height * scale
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  }
}

/**
 * 文字を幅に合わせて折り返す（日本語なので1文字ずつ。改行はそのまま）。
 * 行が多すぎたら最後の行を「…」で切る。幅は measure で測る（Canvas の measureText を渡す）
 */
export const wrapText = (
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (value: string) => number
): string[] => {
  const lines: string[] = []
  for (const paragraph of text.trim().split('\n')) {
    let line = ''
    for (const char of paragraph) {
      if (line !== '' && measure(line + char) > maxWidth) {
        lines.push(line)
        line = char
      } else {
        line += char
      }
    }
    lines.push(line)
  }
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1] ?? ''
  while (last !== '' && measure(`${last}…`) > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last}…`
  return kept
}
