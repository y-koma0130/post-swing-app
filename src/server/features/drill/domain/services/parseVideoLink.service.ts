import type { VideoLink } from '../values/DrillVideo'
import { parseInstagramUrl } from './parseInstagramUrl.service'
import { parseYoutubeUrl } from './parseYoutubeUrl.service'

export type ParseVideoLink = (input: string) => VideoLink | null

/** URL の欄に入れてほしいもの（読めなかったときに出す） */
export const VIDEO_LINK_HINT =
  'YouTube の動画か Instagram の投稿・リールの URL を入れてください（例：https://youtu.be/…）'

/**
 * コーチが貼った URL から、YouTube の動画か Instagram の投稿を読み取る（どちらかはコーチに選ばせない）。
 * どちらでもなければ null
 */
export const parseVideoLink: ParseVideoLink = (input) => {
  const youtube = parseYoutubeUrl(input)
  if (youtube) return { kind: 'youtube', ...youtube }
  const instagram = parseInstagramUrl(input)
  if (instagram) return { kind: 'instagram', ...instagram }
  return null
}
