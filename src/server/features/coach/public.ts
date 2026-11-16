import 'server-only'

/**
 * coach がほかの feature に公開する関数（ほかの feature は、coach の domain・dto と、このファイルだけを使う）
 */
export { findCoachProfileBySlug } from './infrastructure/query-services/findCoachProfileBySlug'
/** Stripe の Webhook（account.updated）で届いた、コーチの口座の状態を記録する */
export {
  isCoach,
  saveChargesEnabled as savePayoutStatus,
} from './infrastructure/repositories/coachRepository'
