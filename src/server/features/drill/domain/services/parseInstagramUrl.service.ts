import {
  type InstagramPostKind,
  type InstagramShortcode,
  instagramShortcodeSchema,
} from '../values/DrillVideo'

export type ParsedInstagramUrl = { postKind: InstagramPostKind; shortcode: InstagramShortcode }

export type ParseInstagramUrl = (input: string) => ParsedInstagramUrl | null

const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am']

/** URL の中の種類（/reels/ は /reel/ と同じ投稿） */
const POST_KIND_OF_SEGMENT: Record<string, InstagramPostKind> = {
  p: 'p',
  reel: 'reel',
  reels: 'reel',
  tv: 'tv',
}

/**
 * コーチが貼った Instagram の投稿の URL から、投稿の種類と ID（shortcode）を取り出す。
 * 投稿・リール・IGTV に対応する（instagram.com/ユーザー名/reel/… の形も読む）。投稿の URL でなければ null
 */
export const parseInstagramUrl: ParseInstagramUrl = (input) => {
  const trimmed = input.trim()
  if (trimmed === '') return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (!INSTAGRAM_HOSTS.includes(url.hostname.toLowerCase())) return null
  const segments = url.pathname.split('/').filter((s) => s !== '')
  const index = segments.findIndex((s) => POST_KIND_OF_SEGMENT[s] !== undefined)
  // 先頭か、ユーザー名の次に種類が来る
  if (index < 0 || index > 1) return null
  const postKind = POST_KIND_OF_SEGMENT[segments[index] ?? '']
  const shortcode = instagramShortcodeSchema.safeParse(segments[index + 1])
  if (!postKind || !shortcode.success) return null
  return { postKind, shortcode: shortcode.data }
}
