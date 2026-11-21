import { PRESSED_CLASS } from '@/app/components/ui/pressStyles'
import { instagramOpenUrl } from '@/app/utils/instagramLink'

type Props = {
  /** 投稿の URL（https://www.instagram.com/reel/…/） */
  url: string
}

/**
 * Instagram の投稿を開くリンク（動画の枠の代わりに置く）。
 * 埋め込みでは見づらいので、スマホなら Instagram のアプリで開いてもらう
 */
export const InstagramLink = ({ url }: Props) => (
  <a
    href={instagramOpenUrl(url)}
    target="_blank"
    rel="noopener noreferrer"
    className={`border-line-soft hover:border-line hover:bg-surface ${PRESSED_CLASS} focus-visible:ring-mint flex items-center gap-3 rounded-lg border bg-white px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none`}
  >
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="text-ink size-7 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
    <span className="min-w-0 flex-1">
      <span className="text-ink block text-sm font-bold">Instagram で見る</span>
      <span className="text-caption text-muted block">Instagram のアプリで開きます</span>
    </span>
    <span aria-hidden className="text-muted shrink-0 text-xl leading-none">
      ›
    </span>
  </a>
)
