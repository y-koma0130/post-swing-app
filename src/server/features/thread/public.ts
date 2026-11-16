import 'server-only'

/** 通知を受け取る人から見た、やりとりの様子（notification が通知をまとめるのに使う） */
export { findThreadActivityFacts } from './infrastructure/query-services/threadActivity'
/**
 * thread がほかの feature に公開する関数（ほかの feature は、thread の domain と、このファイルだけを使う）
 */
export {
  createThread,
  findThreadPayment,
  markThreadRefunded,
  threadExists,
} from './infrastructure/repositories/threadRepository'
