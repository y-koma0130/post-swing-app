import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { markThreadRead } from '../application/usecases/markThreadRead.usecase'
import { findThreadMembers, saveThreadRead } from '../infrastructure/repositories/threadRepository'

/**
 * スレッドを開いたことを記録する（未読の札と通知のまとめに使う）
 *
 * Server Action にすると、呼んだあとに画面が描き直され、開く前の時刻で引いた
 * 「ここから新着」の線が消えてしまう。画面を描き直さないよう、ここだけ API で受ける
 */
export const handleMarkThreadRead = async (threadId: string): Promise<Response> => {
  const actor = await getActor()
  if (!actor) {
    return new Response(null, { status: 401 })
  }
  const result = await markThreadRead(
    { actor, threadId, now: new Date() },
    { findThreadMembers, saveThreadRead }
  )
  return new Response(null, { status: result.ok ? 204 : 404 })
}
