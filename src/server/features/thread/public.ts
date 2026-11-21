import 'server-only'
import { notify } from '@/server/features/notification/public'
import { deleteMediaObject } from '@/server/utils/mediaStorage'
import { requestApproval } from './application/usecases/requestApproval.usecase'
import {
  deleteDraftThreads,
  findDraftThreadToDelete,
} from './infrastructure/repositories/maintenanceRepository'
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

import { logError } from '@/server/utils/logger'

/**
 * カードの仮押さえが済んだ申し込みを、コーチの承認待ちにして、コーチに知らせる（purchase の Webhook から呼ぶ）
 */
export const requestThreadApproval = (input: { purchaseId: string; now: Date }) =>
  requestApproval(input, {
    findThreadByPurchase,
    markThreadRequested,
    notifyApplicationReceived: (i) => notify({ kind: 'application_received', ...i }),
  })

/**
 * 申し込みの下書きを、提出・動画ごと消す（purchase から。生徒がプランを選び直したとき）。
 * 下書きでなければ（カードの登録が済んでいたら）何もしない。消せなかった動画のファイルは残る
 */
export const discardDraftThread = async (threadId: string): Promise<void> => {
  const draft = await findDraftThreadToDelete(threadId)
  if (!draft) return
  for (const key of draft.videoR2Keys) {
    try {
      await deleteMediaObject(key)
    } catch (error) {
      logError('thread', '下書きの動画を消せませんでした', error, { ids: { threadId } })
    }
  }
  await deleteDraftThreads([draft.threadId])
}
