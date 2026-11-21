import { type YoutubeVideo, youtubeVideoIdSchema } from '../values/DrillVideo'

export type ParseYoutubeUrl = (input: string) => YoutubeVideo | null

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com']
const YOUTUBE_HOSTS_WITH_ID_IN_PATH = ['youtu.be']
/** youtube.com/shorts/ID のように、ID がパスに入っている形 */
const PATH_PREFIXES = ['shorts', 'embed', 'live', 'v']

/** 「90」「90s」「1m30s」「1h2m3s」を秒にする。読めなければ 0（頭から） */
const parseStartSec = (value: string | null): number => {
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!match) return 0
  const [, h = '0', m = '0', s = '0'] = match
  return Number(h) * 3600 + Number(m) * 60 + Number(s)
}

const idFromUrl = (url: URL): { id: string | null; vertical: boolean } | null => {
  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter((s) => s !== '')
  if (YOUTUBE_HOSTS_WITH_ID_IN_PATH.includes(host)) {
    return { id: segments[0] ?? null, vertical: false }
  }
  if (!YOUTUBE_HOSTS.includes(host)) return null
  if (segments[0] === 'watch') {
    return { id: url.searchParams.get('v'), vertical: false }
  }
  const [prefix, id] = segments
  return prefix && PATH_PREFIXES.includes(prefix)
    ? { id: id ?? null, vertical: prefix === 'shorts' }
    : null
}

/**
 * コーチが貼った YouTube の URL から、動画 ID と再生を始める秒を取り出す。
 * 通常の動画・Shorts・ライブ・youtu.be の短い URL に対応する。YouTube の動画の URL でなければ null。
 * 開始位置は、YouTube の「共有」で「開始位置」を指定したときに付く t=（start= も読む）。
 * /shorts/ の URL なら縦の動画とみなす（youtu.be の短い URL では分からないので横にする）
 */
export const parseYoutubeUrl: ParseYoutubeUrl = (input) => {
  const trimmed = input.trim()
  if (trimmed === '') return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  const found = idFromUrl(url)
  const id = youtubeVideoIdSchema.safeParse(found?.id)
  if (!found || !id.success) return null
  return {
    youtubeId: id.data,
    startSec: parseStartSec(url.searchParams.get('t') ?? url.searchParams.get('start')),
    vertical: found.vertical,
  }
}
