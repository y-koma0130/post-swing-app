import { parseVideoLink } from '@/server/features/drill/domain/services/parseVideoLink.service'
import type { VideoLink } from '@/server/features/drill/domain/values/DrillVideo'

export type MessagePart = { kind: 'text'; text: string } | { kind: 'url'; url: string }

/** 本文の中の URL（空白・日本語の句読点・かっこで終わる） */
const URL_PATTERN = /https?:\/\/[^\s<>「」『』（）【】、。]+/g
/** URL の後ろに付きがちな記号（文の終わりの「.」や、かっこ閉じ） */
const TRAILING_PUNCTUATION = /[.,!?)\]}'"]+$/

/** 動画を出すのは、1通につき最初のいくつかまで（吹き出しが長くなりすぎないように） */
const MAX_VIDEO_LINKS = 3

/** 本文を、ふつうの文字と URL に分ける（URL はリンクにして出す） */
export const splitMessageUrls = (text: string): MessagePart[] => {
  const parts: MessagePart[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '')
    const start = match.index
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) })
    parts.push({ kind: 'url', url })
    last = start + url.length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}

const linkKey = (link: VideoLink): string =>
  link.kind === 'youtube'
    ? `youtube:${link.youtubeId}:${link.startSec}`
    : `instagram:${link.shortcode}`

/**
 * 本文に貼られた YouTube の動画・Instagram の投稿（メッセージの下に出す）。
 * 同じものは1つにまとめ、最初の3つまで
 */
export const findMessageVideoLinks = (text: string): VideoLink[] => {
  const links = new Map<string, VideoLink>()
  for (const part of splitMessageUrls(text)) {
    if (part.kind !== 'url') continue
    const link = parseVideoLink(part.url)
    if (link && !links.has(linkKey(link))) links.set(linkKey(link), link)
    if (links.size >= MAX_VIDEO_LINKS) break
  }
  return [...links.values()]
}
