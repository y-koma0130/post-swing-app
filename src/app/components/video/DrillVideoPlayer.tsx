import { youtubeEmbedUrl } from '@/app/utils/youtubeEmbed'
import type { DrillVideoDto } from '@/server/features/drill/application/dto/Drill.dto'

type Props = {
  video: DrillVideoDto
  /** 上げた動画を、開く前にどこまで読むか（一覧では長さだけ、時系列では読まない） */
  preload?: 'none' | 'metadata'
}

const frameClass = 'aspect-video w-full rounded-lg bg-black'

/**
 * ドリルのお手本の動画。上げた動画はそのまま、YouTube は埋め込みで再生する（サービスの中で見られる）
 */
export const DrillVideoPlayer = ({ video, preload = 'none' }: Props) =>
  video.kind === 'upload' ? (
    // biome-ignore lint/a11y/useMediaCaption: コーチが撮ったお手本の動画で、字幕はない
    <video
      src={video.url}
      controls
      playsInline
      preload={preload}
      className={`${frameClass} object-contain`}
    />
  ) : (
    <iframe
      src={youtubeEmbedUrl(video.youtubeId, video.startSec)}
      title="お手本の動画（YouTube）"
      loading="lazy"
      // YouTube は埋め込み元が分からないと再生しない（Referer を送る）
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      className={frameClass}
    />
  )
