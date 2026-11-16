import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  type AvatarBlocker,
  checkAvatarUpload,
} from '../../domain/services/checkAvatarUpload.service'

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  findAvatarKey: (coachUserId: string) => Promise<string | null>
  /** 画像の本体を保存する（R2）。受け付けられると分かってから呼ぶ */
  storeAvatar: (r2Key: string, contentType: string) => Promise<void>
  saveAvatarKey: (coachUserId: string, r2Key: string | null) => Promise<void>
  deleteAvatarObject: (r2Key: string) => Promise<void>
  generateId: () => string
}>

export type SetCoachAvatar = (
  params: Readonly<{
    actor: Actor
    /** null なら画像を外す */
    upload: Readonly<{ contentType: string; sizeBytes: number }> | null
  }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | AvatarBlocker>>

/**
 * コーチがプロフィール画像を変える・外す（受け付けられるかは checkAvatarUpload で決める）
 *
 * 画像ごとに別のキーにする（URL が変わるので、ブラウザや SNS のキャッシュが古いまま残らない）。
 * 新しい画像を保存してから、古い画像を消す
 */
export const setCoachAvatar: SetCoachAvatar = async ({ actor, upload }, deps) => {
  if (!(await deps.isCoach(actor.userId))) {
    return err('not_found')
  }
  if (upload) {
    const blocker = checkAvatarUpload(upload)
    if (blocker) return err(blocker)
  }
  const previous = await deps.findAvatarKey(actor.userId)
  let next: string | null = null
  if (upload) {
    const extension = upload.contentType === 'image/png' ? 'png' : 'jpg'
    next = `avatars/${actor.userId}/${deps.generateId()}.${extension}`
    await deps.storeAvatar(next, upload.contentType)
  }
  await deps.saveAvatarKey(actor.userId, next)
  if (previous) {
    await deps.deleteAvatarObject(previous)
  }
  return ok(undefined)
}
