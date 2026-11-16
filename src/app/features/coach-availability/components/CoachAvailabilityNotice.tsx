import type {
  CoachAvailabilityDto,
  UpcomingAbsenceDto,
} from '@/server/features/coach/application/dto/CoachAvailability.dto'
import {
  absentMessage,
  delayedMessage,
  replyTargetMessage,
  upcomingMessage,
} from '../utils/availabilityText'

type Props = {
  coachName: string
  availability: CoachAvailabilityDto
  upcomingAbsence: UpcomingAbsenceDto | null
}

/** 受付ページ・申し込みに出す、コーチの状態（不在・予定・返信遅れ・通常の返信目安） */
export const CoachAvailabilityNotice = ({ coachName, availability, upcomingAbsence }: Props) => {
  if (availability.kind === 'absent') {
    return (
      <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-gray-800">
        {absentMessage(coachName, availability)}
      </p>
    )
  }
  if (availability.kind === 'delayed') {
    return (
      <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-gray-800">
        {delayedMessage(coachName)}
      </p>
    )
  }
  return (
    <div className="space-y-1 text-sm text-gray-600">
      <p>{replyTargetMessage(availability.replyTargetHours)}</p>
      {upcomingAbsence && (
        <p>
          {upcomingMessage(upcomingAbsence)}
          {upcomingAbsence.note && `（${upcomingAbsence.note}）`}
        </p>
      )}
    </div>
  )
}
