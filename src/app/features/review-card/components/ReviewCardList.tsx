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
      <li key={card.id} className="rounded-card overflow-hidden border border-gray-100 bg-white">
        <img
          src={card.imageUrl}
          alt={`${KEY_POSITION_LABEL[card.position]}の添削画像`}
          className="w-full bg-black"
          loading="lazy"
        />
        <div className="space-y-2 p-4">
          <p className="text-mint text-xs font-bold">
            {index + 1}. {KEY_POSITION_LABEL[card.position]}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
            {card.comment}
          </p>
          {card.drill && (
            <div className="bg-mint-soft rounded-xl p-3">
              <p className="text-ink text-xs font-bold">ドリル：{card.drill.title}</p>
              <p className="mt-1 text-xs whitespace-pre-wrap text-gray-700">
                {card.drill.description}
              </p>
            </div>
          )}
        </div>
      </li>
    ))}
  </ol>
)
