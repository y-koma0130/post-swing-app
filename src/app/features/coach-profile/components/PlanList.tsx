import { Card } from '@/app/components/ui/Card'
import { SYSTEM_FEE_NOTE } from '@/app/features/apply/utils/systemFeeText'
import { formatYen } from '@/app/utils/format'
import type { CoachProfileDto } from '@/server/features/coach/application/dto/CoachProfile.dto'

type Props = {
  plans: CoachProfileDto['plans']
}

export const PlanList = ({ plans }: Props) => (
  <div className="space-y-2">
    <ul className="space-y-3">
      {plans.map((plan) => (
        <li key={plan.kind}>
          <Card>
            <div className="flex items-baseline justify-between">
              <h3 className="text-heading">{plan.name}</h3>
              <p className="font-bold">
                {formatYen(plan.priceYen)}
                {plan.kind === 'monthly' && <span className="text-sm font-normal">/月</span>}
              </p>
            </div>
            <p className="text-muted mt-1 text-sm">{plan.description}</p>
          </Card>
        </li>
      ))}
    </ul>
    <p className="text-caption text-muted">{SYSTEM_FEE_NOTE}</p>
  </div>
)
