import type { GolfProfile } from '@/server/features/thread/domain/values/GolfProfile'
import { ROUND_FREQUENCY_LABEL } from '../utils/threadText'

type Props = {
  golfProfile: GolfProfile
}

/**
 * 生徒のゴルフの様子（申し込みのときに任意で書いたもの）。コーチが悩みと一緒に見る。
 * 書いていない項目は「—」にして、欄そのものは出す（聞いたことが分かるように）
 */
export const GolfProfileBox = ({ golfProfile }: Props) => (
  <dl className="bg-surface grid grid-cols-2 gap-3 rounded-lg p-3">
    <div>
      <dt className="text-caption text-muted font-bold">ふだんのラウンド</dt>
      <dd className="text-body mt-1 text-sm">
        {golfProfile.roundFrequency ? ROUND_FREQUENCY_LABEL[golfProfile.roundFrequency] : '—'}
      </dd>
    </div>
    <div>
      <dt className="text-caption text-muted font-bold">平均スコア</dt>
      <dd className="text-body mt-1 text-sm">{golfProfile.averageScore ?? '—'}</dd>
    </div>
  </dl>
)
