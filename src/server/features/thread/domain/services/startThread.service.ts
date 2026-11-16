import type { NewThread, Thread } from '../values/Thread'
import { calcThreadPeriod } from './calcThreadPeriod.service'

export type StartThread = (
  input: Readonly<{
    id: string
    purchaseId: string
    coachUserId: string
    studentUserId: string
    planKind: Thread['planKind']
    paidAt: Date
    /** 月額のときの請求 */
    stripeInvoiceId: string | null
  }>
) => NewThread

/**
 * 支払いが済んだら始めるスレッド
 *
 * ドメインルール:
 * - 支払った時点から期間が始まる
 * - 最初は生徒の番（動画を送るところから始まる）
 */
export const startThread: StartThread = ({ paidAt, ...rest }) => ({
  ...rest,
  status: 'waiting_student',
  ...calcThreadPeriod(paidAt),
})
