import 'server-only'

/**
 * coach がほかの feature に公開する関数（ほかの feature は、coach の domain・dto と、このファイルだけを使う）
 */
export { findCoachProfileBySlug } from './infrastructure/query-services/findCoachProfileBySlug'
export { findAbsencesEndingOn } from './infrastructure/repositories/absenceRepository'
/** Stripe の Webhook（account.updated）で届いた、コーチの口座の状態を記録する */
export {
  isCoach,
  saveChargesEnabled as savePayoutStatus,
} from './infrastructure/repositories/coachRepository'
/** コーチの不在期間と返信遅れフラグ、今の状態（thread・purchase が判定に使う） */
export {
  findCoachAvailability,
  findCoachAvailabilityFacts,
  findCoachAvailabilityFactsForCoaches,
  toAvailabilityDto,
  toUpcomingAbsenceDto,
} from './presentation/availability'
