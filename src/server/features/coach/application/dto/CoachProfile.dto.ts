import type { SignupGuard } from '../../domain/services/decideSignupGuard.service'
import type { PlanKind } from '../../domain/values/Plan'
import type { CoachAvailabilityDto, UpcomingAbsenceDto } from './CoachAvailability.dto'

/**
 * 受付ページに出すコーチ情報
 */
export type CoachProfileDto = {
  slug: string
  name: string
  title: string
  bio: string
  instagram: string
  remainingCapacity: number
  /** 申し込みを受けられるか（Stripe の口座ができていて、受付中のプランがある） */
  acceptingApplications: boolean
  /** 今の状態（不在・返信遅れ） */
  availability: CoachAvailabilityDto
  /** 7日以内に始まる不在 */
  upcomingAbsence: UpcomingAbsenceDto | null
  /** 不在・返信遅れのときの申し込みの扱い（open・ack_required・paused） */
  signupGuard: SignupGuard
  /** 受付中のプランだけ */
  plans: Array<{
    kind: PlanKind
    name: string
    priceYen: number
    description: string
  }>
}
