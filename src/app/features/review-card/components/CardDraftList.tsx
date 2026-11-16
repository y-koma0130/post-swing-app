'use client'

import { inputClass } from '@/app/components/ui/fieldStyles'
import { KEY_POSITION_LABEL } from '@/app/features/thread/utils/threadText'
import type { CardDraft } from '../hooks/useCardDrafts'

type Props = {
  drafts: CardDraft[]
  /** カードを作った動画の呼び方（「正面」など）。動画が1本なら null */
  videoLabel?: ((videoId: string) => string | null) | undefined
  onChange: (localId: string, patch: Partial<Pick<CardDraft, 'comment'>>) => void
  onRemove: (localId: string) => void
}

/** 作りかけの添削の画像。画像ごとに一言を書ける（任意） */
export const CardDraftList = ({ drafts, videoLabel, onChange, onRemove }: Props) => (
  <ol className="space-y-3">
    {drafts.map((draft, index) => (
      <li key={draft.localId} className="border-line-soft space-y-2 rounded-xl border bg-white p-3">
        <div className="flex items-start gap-3">
          <img
            src={draft.imageUrl}
            alt={`${KEY_POSITION_LABEL[draft.position]}のキャプチャ`}
            className="w-20 shrink-0 rounded-lg bg-black"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold">
              {index + 1}. {videoLabel?.(draft.videoId) ? `${videoLabel(draft.videoId)}・` : ''}
              {KEY_POSITION_LABEL[draft.position]}
              <span className="text-caption text-muted ml-2 font-mono font-normal">
                {draft.timeSec.toFixed(2)}秒
              </span>
            </p>
            <button
              type="button"
              onClick={() => onRemove(draft.localId)}
              className="text-caption text-muted underline"
            >
              この画像を消す
            </button>
          </div>
        </div>
        <textarea
          aria-label="この画像の一言"
          value={draft.comment}
          onChange={(event) => onChange(draft.localId, { comment: event.currentTarget.value })}
          rows={2}
          maxLength={200}
          placeholder="この画像の一言（任意）　例：右ひざが伸びている"
          className={inputClass}
        />
      </li>
    ))}
  </ol>
)
