import Link from 'next/link'
import type { CoachAvailabilityDto } from '@/server/features/coach/application/dto/CoachAvailability.dto'
import { formatShortDate } from '../utils/availabilityText'

type Props = {
  availability: CoachAvailabilityDto
}

/** コーチのホームの帯（不在中・返信遅れのとき） */
export const AvailabilityBanner = ({ availability }: Props) => {
  if (availability.kind === 'available') return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm">
      <span className="font-bold">
        {availability.kind === 'absent'
          ? `${formatShortDate(availability.endDate)}まで不在モードです`
          : '「返信が遅れる場合があります」と表示しています'}
      </span>
      <Link href="/coach/availability" className="underline">
        設定を変える
      </Link>
    </div>
  )
}
