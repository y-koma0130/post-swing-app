import { InstagramLink } from '@/app/components/video/InstagramLink'
import { YoutubePlayer } from '@/app/components/video/YoutubePlayer'
import { instagramPostUrl, type VideoLink } from '@/server/features/drill/domain/values/DrillVideo'

/** URL で添えた動画（YouTube は埋め込みで再生、Instagram は投稿を開くカード） */
export const VideoLinkPreview = ({ link }: { link: VideoLink }) =>
  link.kind === 'youtube' ? (
    <YoutubePlayer youtubeId={link.youtubeId} startSec={link.startSec} vertical={link.vertical} />
  ) : (
    <InstagramLink url={instagramPostUrl(link)} />
  )
