import Link from 'next/link'
import { Card } from '@/app/components/ui/Card'
import { formatYen } from '@/app/utils/format'
import type { MyPurchaseDto } from '@/server/features/purchase/application/dto/MyPurchase.dto'
import { openBillingPortalAction } from '@/server/features/purchase/presentation/actions'

const PLAN_LABEL = { trial: 'お試し', single: '1スレッド', monthly: '月額' } as const

type Props = {
  purchases: MyPurchaseDto[]
  /** コーチの名前を出すか（コーチ詳細ページでは同じコーチだけなので出さない） */
  showCoach: boolean
}

/** 生徒の申し込みの一覧。月額は解約・カードの変更へ進める */
export const MyPurchaseList = ({ purchases, showCoach }: Props) => (
  <ul className="space-y-3">
    {purchases.map((p) => (
      <li key={p.id}>
        <Card className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            {showCoach ? (
              <Link href={`/me/coaches/${p.coachSlug}`} className="font-bold">
                {p.coachName}
              </Link>
            ) : (
              <span className="font-bold">{PLAN_LABEL[p.planKind]}</span>
            )}
            <span className="text-muted text-sm">
              {showCoach && `${PLAN_LABEL[p.planKind]}・`}
              {formatYen(p.priceYen + p.systemFeeYen)}
              {p.systemFeeYen > 0 && '（利用料込み）'}
              {p.status === 'canceled' && '（解約済み）'}
            </span>
          </div>
          {p.canManage && p.status === 'paid' && (
            <form action={openBillingPortalAction}>
              <input type="hidden" name="purchaseId" value={p.id} />
              <button type="submit" className="text-muted text-sm underline">
                月額の解約・カードの変更
              </button>
            </form>
          )}
        </Card>
      </li>
    ))}
  </ul>
)
