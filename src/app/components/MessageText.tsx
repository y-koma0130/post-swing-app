import { inlineLinkClass } from '@/app/components/ui/linkStyles'
import { VideoLinkPreview } from '@/app/components/video/VideoLinkPreview'
import { findMessageVideoLinks, splitMessageUrls } from '@/app/utils/messageLinks'

/**
 * チャットの本文。URL は押せるリンクにし、YouTube の動画・Instagram の投稿は本文の下に出す
 * （コーチも生徒も、URL を貼るだけで見せられる）
 */
export const MessageText = ({ body }: { body: string }) => {
  const links = findMessageVideoLinks(body)
  return (
    <>
      <p className="break-words whitespace-pre-wrap">
        {splitMessageUrls(body).map((part, i) =>
          part.kind === 'url' ? (
            <a
              // biome-ignore lint/suspicious/noArrayIndexKey: 本文の並びは変わらない
              key={i}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${inlineLinkClass} break-all`}
            >
              {part.url}
            </a>
          ) : (
            part.text
          )
        )}
      </p>
      {links.map((link) => (
        <VideoLinkPreview
          key={link.kind === 'youtube' ? `${link.youtubeId}:${link.startSec}` : link.shortcode}
          link={link}
        />
      ))}
    </>
  )
}
