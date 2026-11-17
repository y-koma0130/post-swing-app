import type { NewThread, Thread } from '../values/Thread'
import { calcThreadPeriod } from './calcThreadPeriod.service'

export type StartDraftThread = (
  input: Readonly<{
    id: string
    purchaseId: string
    coachUserId: string
    studentUserId: string
    planKind: Exclude<Thread['planKind'], 'monthly'>
    now: Date
  }>
) => NewThread

/**
 * 申し込みの下書きのスレッド（生徒が悩みと動画を送り、カードを登録するところ）
 *
 * ドメインルール:
 * - コーチにはまだ見えない。カードを仮押さえしたら承認待ちになる
 * - 開始と期限は仮の値。コーチが承認した時点で決め直す
 */
export const startDraftThread: StartDraftThread = ({ now, ...rest }) => ({
  ...rest,
  status: 'draft',
  ...calcThreadPeriod(now),
  stripeInvoiceId: null,
})
