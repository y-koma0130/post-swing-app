import type { ReactNode } from 'react'
import { KEY_POSITION_LABEL, quoteAnchorId } from '@/app/features/thread/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'

type Card = NonNullable<ThreadDetailDto['submissions'][number]['reply']>['cards'][number]

type Props = {
  cards: Card[]
  /** カードを作った動画の呼び方（「正面」など）。動画が1本なら null */
  videoLabel?: ((videoId: string) => string | null) | undefined
  /** 画像を押したとき（大きく見る） */
  onOpen: () => void
  /** カードごとの操作（「引用する」など） */
  renderAction?: ((card: Card) => ReactNode) | undefined
}

/**
 * 送った添削カードを、左に小さな画像、右に理由の一覧で見せる（コーチの時系列用。大きく見るのはドロワー）
 */
export const ReviewCardStrip = ({ cards, videoLabel, onOpen, renderAction }: Props) => {
  const title = (card: Card, index: number) =>
    `${index + 1}. ${videoLabel?.(card.videoId) ? `${videoLabel(card.videoId)}・` : ''}${KEY_POSITION_LABEL[card.position]}`
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
      <ol className="flex flex-wrap content-start gap-2 sm:max-w-80">
        {cards.map((card, index) => (
          <li key={card.id} id={quoteAnchorId('card', card.id)} className="w-36 scroll-mt-20">
            <button
              type="button"
              onClick={onOpen}
              className="relative block w-full overflow-hidden rounded-lg bg-black"
              aria-label={`${title(card, index)}のカードを大きく見る`}
            >
              <img
                src={card.imageUrl}
                alt=""
                className="aspect-video w-full object-contain"
                loading="lazy"
              />
              <span className="text-caption absolute top-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 font-bold text-white">
                {index + 1}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <ol className="space-y-3">
        {cards.map((card, index) => (
          <li key={card.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-mint text-caption font-bold">{title(card, index)}</p>
              {renderAction?.(card)}
            </div>
            <p className="text-body text-sm whitespace-pre-wrap">{card.comment}</p>
            {card.drill && (
              <p className="text-caption text-ink bg-mint-soft rounded-md px-2 py-1">
                ドリル：{card.drill.title}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
