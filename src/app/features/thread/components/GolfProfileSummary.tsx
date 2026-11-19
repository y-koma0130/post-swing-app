import type { GolfProfile } from '@/server/features/thread/domain/values/GolfProfile'
import { ROUND_FREQUENCY_LABEL } from '../utils/threadText'

type Props = {
  golfProfile: GolfProfile
}

/**
 * 生徒のゴルフの様子（申し込みのときに任意で書いたもの）。悩み・メモを読むときの補足なので、1行の小さな文字で出す。
 * 書いていない項目は「—」にして、項目そのものは出す（聞いたことが分かるように）
 */
export const GolfProfileSummary = ({ golfProfile }: Props) => (
  <dl className="text-caption text-muted flex flex-wrap gap-x-4 gap-y-1">
    <div className="flex">
      <dt>ふだんのラウンド：</dt>
      <dd className="text-body">
        {golfProfile.roundFrequency ? ROUND_FREQUENCY_LABEL[golfProfile.roundFrequency] : '—'}
      </dd>
    </div>
    <div className="flex">
      <dt>平均スコア：</dt>
      <dd className="text-body">{golfProfile.averageScore ?? '—'}</dd>
    </div>
  </dl>
)
