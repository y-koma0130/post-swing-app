'use client'

import { inputClass } from '@/app/components/ui/fieldStyles'
import { VideoLinkPreview } from '@/app/components/video/VideoLinkPreview'
import { formatStartSec } from '@/app/utils/youtubeEmbed'
import { parseVideoLink } from '@/server/features/drill/domain/services/parseVideoLink.service'

type Props = {
  /** フォームで送る名前 */
  name: string
  value: string
  onChange: (value: string) => void
  /** 読み上げ用の名前（見出しは呼ぶ側で置く） */
  ariaLabel: string
}

/**
 * YouTube の動画か Instagram の投稿の URL を貼る欄（どちらかは URL から判別する）。
 * 貼った時点で中身を見せ、それぞれの注意を出す。読めない URL ならその場で知らせる
 */
export const VideoLinkField = ({ name, value, onChange, ariaLabel }: Props) => {
  const link = parseVideoLink(value)
  const typed = value.trim() !== ''
  return (
    <div className="space-y-2">
      <input
        name={name}
        type="url"
        inputMode="url"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="https://youtu.be/… や https://www.instagram.com/reel/…"
        aria-label={ariaLabel}
        aria-invalid={typed && !link}
        className={inputClass}
      />
      {link?.kind === 'youtube' ? (
        <>
          <VideoLinkPreview link={link} />
          <p className="text-caption text-muted">
            {link.startSec > 0 ? `${formatStartSec(link.startSec)} から再生します。` : ''}
            公開か限定公開の動画が使えます。YouTube の「共有」で開始位置を指定した URL
            なら、その位置から再生します。
          </p>
        </>
      ) : link?.kind === 'instagram' ? (
        <>
          <VideoLinkPreview link={link} />
          <p className="text-caption text-muted">
            生徒が押すと、Instagram
            のアプリで投稿が開きます。鍵をかけたアカウントの投稿は、フォローしていない生徒には見えません。
          </p>
        </>
      ) : typed ? (
        <p className="text-caption text-danger">
          YouTube の動画か Instagram の投稿・リールの URL ではないようです
        </p>
      ) : (
        <p className="text-caption text-muted">
          YouTube の動画（Shorts も可）か、Instagram の投稿・リールの URL を貼ってください。
        </p>
      )}
    </div>
  )
}
