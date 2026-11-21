import { InstagramLink } from '@/app/components/video/InstagramLink'
import { YoutubePlayer } from '@/app/components/video/YoutubePlayer'
import type { DrillVideoDto } from '@/server/features/drill/application/dto/Drill.dto'

type Props = {
  video: DrillVideoDto
  /** 上げた動画を、開く前にどこまで読むか（一覧では長さだけ、時系列では読まない） */
  preload?: 'none' | 'metadata'
}

/**
 * ドリルのお手本の動画。上げた動画はそのまま、YouTube は埋め込みで再生する（サービスの中で見られる）。
 * Instagram は投稿を開くリンクにする
 */
export const DrillVideoPlayer = ({ video, preload = 'none' }: Props) =>
  video.kind === 'instagram' ? (
    <InstagramLink url={video.url} />
  ) : video.kind === 'upload' ? (
    // biome-ignore lint/a11y/useMediaCaption: コーチが撮ったお手本の動画で、字幕はない
    <video
      src={video.url}
      controls
      playsInline
      preload={preload}
      className="aspect-video w-full rounded-lg bg-black object-contain"
    />
  ) : (
    <YoutubePlayer youtubeId={video.youtubeId} startSec={video.startSec} />
  )
