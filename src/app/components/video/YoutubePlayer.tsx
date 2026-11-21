'use client'

import { useState } from 'react'
import { youtubeEmbedUrl, youtubeThumbnailUrl } from '@/app/utils/youtubeEmbed'

type Props = {
  youtubeId: string
  startSec: number
  /** Shorts（縦の動画）なら縦の枠にする */
  vertical: boolean
}

/**
 * YouTube の動画（ダウンロードせず、サービスの中で埋め込みで再生する）。
 * 最初はサムネイルだけ出し、押したら YouTube のプレーヤーを読み込む
 * （やりとりに何本並んでも重くならないように）
 */
export const YoutubePlayer = ({ youtubeId, startSec, vertical }: Props) => {
  const [playing, setPlaying] = useState(false)
  // 黒い帯のない画像を先に試し、なければどの動画にもある画像にする
  const [thumbnailSize, setThumbnailSize] = useState<'hq720' | 'hqdefault'>('hq720')
  const frameClass = `${vertical ? 'mx-auto aspect-[9/16] max-w-60' : 'aspect-video'} w-full overflow-hidden rounded-lg bg-black`
  if (playing) {
    return (
      <iframe
        src={youtubeEmbedUrl(youtubeId, startSec, { autoplay: true })}
        title="YouTube の動画"
        // YouTube は埋め込み元が分からないと再生しない（Referer を送る）
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className={`${frameClass} block`}
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="YouTube の動画を再生する"
      className={`${frameClass} group focus-visible:ring-mint relative block focus-visible:ring-2 focus-visible:outline-none`}
    >
      <img
        src={youtubeThumbnailUrl(youtubeId, thumbnailSize)}
        onError={() => setThumbnailSize('hqdefault')}
        alt=""
        loading="lazy"
        className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100 group-active:opacity-75"
      />
      <span
        aria-hidden
        className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-black/60 transition-transform group-active:scale-95"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="ml-1 size-7 text-white" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </button>
  )
}
