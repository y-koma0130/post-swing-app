import type { ReactNode } from 'react'
import { KEY_POSITION_LABEL, quoteAnchorId } from '@/app/features/thread/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'

type Card = NonNullable<ThreadDetailDto['submissions'][number]['reply']>['cards'][number]

type Props = {
  cards: Card[]
  /** カードを作った動画の呼び方（「正面」など）。動画が1本なら出さなくてよいので null */
  videoLabel?: ((videoId: string) => string | null) | undefined
  /** カードごとの操作（「引用する」など） */
  renderAction?: ((card: Card) => ReactNode) | undefined
}

export { KEY_POSITION_LABEL }

/** 添削カード（キャプチャ画像＋線＋理由）を縦に並べる。生徒のスマホで見る前提 */
export const ReviewCardList = ({ cards, videoLabel, renderAction }: Props) => (
  <ol className="space-y-4">
    {cards.map((card, index) => (
      <li
        key={card.id}
        id={quoteAnchorId('card', card.id)}
        className="rounded-card border-line-soft scroll-mt-20 overflow-hidden border bg-white"
      >
        <img
          src={card.imageUrl}
          alt={`${KEY_POSITION_LABEL[card.position]}の添削画像`}
          className="w-full bg-black"
          loading="lazy"
        />
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-mint text-caption font-bold">
              {index + 1}. {videoLabel?.(card.videoId) ? `${videoLabel(card.videoId)}・` : ''}
              {KEY_POSITION_LABEL[card.position]}
            </p>
            {renderAction?.(card)}
          </div>
          <p className="text-body text-sm leading-relaxed whitespace-pre-wrap">{card.comment}</p>
          {card.drill && (
            <div className="bg-mint-soft rounded-xl p-3">
              <p className="text-ink text-caption font-bold">ドリル：{card.drill.title}</p>
              <p className="text-caption text-body mt-1 whitespace-pre-wrap">
                {card.drill.description}
              </p>
            </div>
          )}
        </div>
      </li>
    ))}
  </ol>
)
