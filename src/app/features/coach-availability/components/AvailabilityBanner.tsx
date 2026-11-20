import Link from 'next/link'
import { inlineLinkClass } from '@/app/components/ui/linkStyles'
import { Notice } from '@/app/components/ui/Notice'
import type { CoachAvailabilityDto } from '@/server/features/coach/application/dto/CoachAvailability.dto'
import { formatShortDate } from '../utils/availabilityText'

type Props = {
  availability: CoachAvailabilityDto
}

/** コーチのホームの帯（不在中・返信遅れのとき） */
export const AvailabilityBanner = ({ availability }: Props) => {
  if (availability.kind === 'available') return null
  return (
    <Notice tone="warning" status>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">
          {availability.kind === 'absent'
            ? `${formatShortDate(availability.endDate)}まで不在モードです`
            : '「返信が遅れる場合があります」と表示しています'}
        </span>
        <Link href="/coach/availability" className={inlineLinkClass}>
          設定を変える
        </Link>
      </div>
    </Notice>
  )
}
