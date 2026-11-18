import 'server-only'
import { notify } from '@/server/features/notification/public'
import { requestApproval } from './application/usecases/requestApproval.usecase'
import {
  findThreadByPurchase,
  markThreadRequested,
} from './infrastructure/repositories/threadRepository'

/** 通知を受け取る人から見た、やりとりの様子（notification が通知をまとめるのに使う） */
export { findThreadActivityFacts } from './infrastructure/query-services/threadActivity'
/**
 * thread がほかの feature に公開する関数（ほかの feature は、thread の domain と、このファイルだけを使う）
 */
export {
  createThread,
  findApplicationThread,
  findOpenApplication,
  findThreadPayment,
  markThreadRefunded,
  threadExists,
} from './infrastructure/repositories/threadRepository'

/**
 * カードの仮押さえが済んだ申し込みを、コーチの承認待ちにして、コーチに知らせる（purchase の Webhook から呼ぶ）
 */
export const requestThreadApproval = (input: { purchaseId: string; now: Date }) =>
  requestApproval(input, {
    findThreadByPurchase,
    markThreadRequested,
    notifyApplicationReceived: (i) => notify({ kind: 'application_received', ...i }),
  })
