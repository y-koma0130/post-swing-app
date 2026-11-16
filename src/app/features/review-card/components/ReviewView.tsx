import type { ReactNode } from 'react'
import { DrillDetails } from '@/app/features/thread/components/DrillDetails'
import { KEY_POSITION_LABEL, quoteAnchorId } from '@/app/features/thread/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'

type Reply = NonNullable<ThreadDetailDto['submissions'][number]['reply']>
type Card = Reply['cards'][number]

type Props = {
  reply: Reply
  /** 画像を作った動画の呼び方（「正面」など）。動画が1本なら null */
  videoLabel?: ((videoId: string) => string | null) | undefined
  /** 画像ごとの操作（「引用する」など） */
  renderAction?: ((card: Card) => ReactNode) | undefined
  /** 画像の札を包む（生徒の画面で、長押しで引用できるようにする） */
  wrapCard?: ((card: Card, content: ReactNode) => ReactNode) | undefined
}

/** 画像の見出し（「1. 正面・トップ」） */
export const cardTitle = (
  card: Card,
  index: number,
  videoLabel?: ((videoId: string) => string | null) | undefined
): string =>
  `${index + 1}. ${videoLabel?.(card.videoId) ? `${videoLabel(card.videoId)}・` : ''}${KEY_POSITION_LABEL[card.position]}`

/**
 * 1回の添削（生徒のスマホで読む形）。画像を横に並べ（スワイプで見る）、その下に説明とおすすめのドリル
 */
export const ReviewView = ({ reply, videoLabel, renderAction, wrapCard }: Props) => (
  <div className="space-y-4">
    <ol className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
      {reply.cards.map((card, index) => (
        <li
          key={card.id}
          id={quoteAnchorId('card', card.id)}
          className="rounded-card border-line-soft w-[85%] max-w-sm shrink-0 snap-start scroll-mt-20 overflow-hidden border bg-white"
        >
          {(wrapCard ?? ((_: Card, content: ReactNode) => content))(
            card,
            <>
              <img
                src={card.imageUrl}
                alt={`${KEY_POSITION_LABEL[card.position]}の添削画像`}
                className="aspect-video w-full bg-black object-contain"
                loading="lazy"
              />
              <div className="space-y-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-mint text-caption font-bold">
                    {cardTitle(card, index, videoLabel)}
                  </p>
                  {renderAction?.(card)}
                </div>
                {card.comment && (
                  <p className="text-body text-sm whitespace-pre-wrap">{card.comment}</p>
                )}
              </div>
            </>
          )}
        </li>
      ))}
    </ol>
    {reply.comment && (
      <p className="text-body rounded-card bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
        {reply.comment}
      </p>
    )}
    {reply.drills.length > 0 && (
      <div className="space-y-2">
        <p className="text-caption text-muted font-bold">おすすめのドリル</p>
        {reply.drills.map((drill) => (
          <DrillDetails key={drill.title} title={drill.title} description={drill.description} />
        ))}
      </div>
    )}
  </div>
)
