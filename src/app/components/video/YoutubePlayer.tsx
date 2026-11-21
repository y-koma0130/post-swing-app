import { youtubeEmbedUrl } from '@/app/utils/youtubeEmbed'

type Props = {
  youtubeId: string
  startSec: number
}

/** YouTube の動画を埋め込みで再生する（ダウンロードせず、サービスの中で見られる） */
export const YoutubePlayer = ({ youtubeId, startSec }: Props) => (
  <iframe
    src={youtubeEmbedUrl(youtubeId, startSec)}
    title="YouTube の動画"
    loading="lazy"
    // YouTube は埋め込み元が分からないと再生しない（Referer を送る）
    referrerPolicy="strict-origin-when-cross-origin"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
    className="aspect-video w-full rounded-lg bg-black"
  />
)
