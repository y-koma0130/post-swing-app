import { Notice } from '@/app/components/ui/Notice'
import type { ShareConsentDto } from '@/server/features/share/application/dto/ShareConsent.dto'

type Props = {
  consent: ShareConsentDto
  /** モニターの申し込み */
  monitor: boolean
}

const yesNo = (value: boolean) => (value ? '可' : '不可')

/** コーチの添削画面に出す、生徒が選んだ公開の許可（シェア画像を作るときの範囲） */
export const ShareConsentSummary = ({ consent, monitor }: Props) => (
  <Notice tone={consent?.allowPublish ? 'mint' : 'neutral'}>
    <p>
      {monitor && <span className="font-bold">モニター・</span>}
      {consent?.allowPublish
        ? `SNS での紹介の許可あり（顔：${consent.showFace ? 'そのまま可' : 'ぼかす'}・年代：${yesNo(consent.showAgeRange)}・平均スコア：${yesNo(consent.showScore)}）。名前は出しません`
        : '生徒は SNS での紹介を許可していません'}
    </p>
  </Notice>
)
