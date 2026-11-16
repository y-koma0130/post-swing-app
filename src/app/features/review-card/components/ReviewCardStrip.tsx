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

/** 送った添削カードを小さく横に並べる（コーチの時系列用。大きく見るのはドロワー） */
export const ReviewCardStrip = ({ cards, videoLabel, onOpen, renderAction }: Props) => (
  <ol className="flex gap-3 overflow-x-auto pb-1">
    {cards.map((card, index) => (
      <li
        key={card.id}
        id={quoteAnchorId('card', card.id)}
        className="w-36 shrink-0 scroll-mt-20 space-y-1"
      >
        <button
          type="button"
          onClick={onOpen}
          className="block w-full overflow-hidden rounded-lg bg-black"
          aria-label={`${KEY_POSITION_LABEL[card.position]}のカードを大きく見る`}
        >
          <img
            src={card.imageUrl}
            alt=""
            className="aspect-video w-full object-contain"
            loading="lazy"
          />
        </button>
        <p className="text-mint text-caption font-bold">
          {index + 1}. {videoLabel?.(card.videoId) ? `${videoLabel(card.videoId)}・` : ''}
          {KEY_POSITION_LABEL[card.position]}
        </p>
        <p className="text-caption text-body line-clamp-2">{card.comment}</p>
        {renderAction && <div className="flex justify-end">{renderAction(card)}</div>}
      </li>
    ))}
  </ol>
)
