import { formatYen } from '@/app/utils/format'
import { PLAN_KIND_LABEL } from '@/app/utils/planText'
import type { MyPurchaseDto } from '@/server/features/purchase/application/dto/MyPurchase.dto'
import { BillingPortalButton } from './BillingPortalButton'

type Props = {
  purchases: MyPurchaseDto[]
  /** コーチの名前を出すか（コーチ詳細ページでは同じコーチだけなので出さない） */
  showCoach: boolean
}

/**
 * 生徒の購入したプランの一覧。見るだけのものなのでカード（押せるものの見た目）にはせず、区切り線で並べる。
 * 押せるのは、月額の「解約・カードの変更」のボタンだけ
 */
export const MyPurchaseList = ({ purchases, showCoach }: Props) => (
  <ul className="divide-line-soft border-line-soft divide-y border-y">
    {purchases.map((p) => (
      <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <div className="min-w-0">
          <p className="font-bold">
            {PLAN_KIND_LABEL[p.planKind]}
            {p.status === 'canceled' && (
              <span className="text-muted ml-2 text-sm font-normal">解約済み</span>
            )}
          </p>
          <p className="text-muted text-sm">
            {showCoach && `${p.coachName}・`}
            {formatYen(p.priceYen + p.systemFeeYen)}
            {p.systemFeeYen > 0 && '（利用料込み）'}
          </p>
        </div>
        {p.canManage && p.status === 'paid' && <BillingPortalButton purchaseId={p.id} />}
      </li>
    ))}
  </ul>
)
