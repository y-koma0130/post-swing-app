import type { ReactNode } from 'react'
import { KEY_POSITION_LABEL, quoteAnchorId } from '@/app/features/thread/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'

type Reply = NonNullable<ThreadDetailDto['submissions'][number]['reply']>
type Card = Reply['cards'][number]

type Props = {
  reply: Reply
  /** カードを作った動画の呼び方（「正面」など）。動画が1本なら null */
  videoLabel?: ((videoId: string) => string | null) | undefined
  /** 画像を押したとき（大きく見る） */
  onOpen: () => void
  /** カードごとの操作（「引用する」など） */
  renderAction?: ((card: Card) => ReactNode) | undefined
}

/**
 * 送った添削を、左に小さな画像、右に説明・ドリル・画像ごとの一言で見せる（コーチの時系列用。大きく見るのはドロワー）
 */
export const ReviewCardStrip = ({ reply, videoLabel, onOpen, renderAction }: Props) => {
  const { cards } = reply
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
      <div className="space-y-3">
        {reply.comment && (
          <p className="text-body text-sm leading-relaxed whitespace-pre-wrap">{reply.comment}</p>
        )}
        {reply.drills.length > 0 && (
          <p className="text-caption text-ink bg-mint-soft rounded-md px-2 py-1">
            ドリル：{reply.drills.map((d) => d.title).join('・')}
          </p>
        )}
        <ol className="space-y-1">
          {cards.map((card, index) => (
            <li key={card.id} className="flex items-start justify-between gap-2">
              <p className="text-caption min-w-0">
                <span className="text-mint font-bold">{title(card, index)}</span>
                {card.comment && <span className="text-body ml-2">{card.comment}</span>}
              </p>
              {renderAction?.(card)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
