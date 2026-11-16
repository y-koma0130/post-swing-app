import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import type { KeyPosition } from '@/server/features/thread/domain/values/KeyPosition'

type Card = NonNullable<ThreadDetailDto['videos'][number]['reply']>['cards'][number]

type Props = {
  cards: Card[]
}

export const KEY_POSITION_LABEL = {
  address: 'アドレス',
  top: 'トップ',
  impact: 'インパクト',
  finish: 'フィニッシュ',
} as const satisfies Record<KeyPosition, string>

/** 添削カード（キャプチャ画像＋線＋理由）を縦に並べる。生徒のスマホで見る前提 */
export const ReviewCardList = ({ cards }: Props) => (
  <ol className="space-y-4">
    {cards.map((card, index) => (
      <li key={card.id} className="rounded-card border-line-soft overflow-hidden border bg-white">
        <img
          src={card.imageUrl}
          alt={`${KEY_POSITION_LABEL[card.position]}の添削画像`}
          className="w-full bg-black"
          loading="lazy"
        />
        <div className="space-y-2 p-4">
          <p className="text-mint text-caption font-bold">
            {index + 1}. {KEY_POSITION_LABEL[card.position]}
          </p>
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
