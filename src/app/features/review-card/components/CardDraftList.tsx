'use client'

import { inputClass } from '@/app/components/ui/fieldStyles'
import type { DrillDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { CardDraft } from '../hooks/useCardDrafts'
import { KEY_POSITION_LABEL } from './ReviewCardList'

type Props = {
  drafts: CardDraft[]
  drills: DrillDto[]
  /** カードを作った動画の呼び方（「正面」など）。動画が1本なら null */
  videoLabel?: ((videoId: string) => string | null) | undefined
  onChange: (localId: string, patch: Partial<Pick<CardDraft, 'comment' | 'drillId'>>) => void
  onRemove: (localId: string) => void
}

/** 作りかけの添削カード。理由を書き、ドリルを添える */
export const CardDraftList = ({ drafts, drills, videoLabel, onChange, onRemove }: Props) => (
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
              このカードを消す
            </button>
          </div>
        </div>
        <textarea
          aria-label="理由"
          value={draft.comment}
          onChange={(event) => onChange(draft.localId, { comment: event.currentTarget.value })}
          rows={3}
          maxLength={2000}
          placeholder="何がどうなっていて、どう直すか"
          className={inputClass}
        />
        {drills.length > 0 && (
          <select
            aria-label="ドリル"
            value={draft.drillId ?? ''}
            onChange={(event) =>
              onChange(draft.localId, { drillId: event.currentTarget.value || null })
            }
            className={inputClass}
          >
            <option value="">ドリルを添えない</option>
            {drills.map((drill) => (
              <option key={drill.id} value={drill.id}>
                {drill.title}
              </option>
            ))}
          </select>
        )}
      </li>
    ))}
  </ol>
)
