import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { CoachProfile } from '../../domain/values/Coach'
import type { CoachSlug } from '../../domain/values/CoachSlug'
import { allocateRandomSlug } from '../allocateRandomSlug'

export type UpdateCoachProfileParams = Readonly<{
  actor: Actor
  /** スラッグが null なら、ランダムな文字列にする */
  profile: Omit<CoachProfile, 'slug'> & { slug: CoachSlug | null }
}>

type Dependencies = Readonly<{
  findCoachSlug: (userId: string) => Promise<CoachSlug | null>
  isSlugTaken: (slug: CoachSlug) => Promise<boolean>
  /** 確かめたあとに同じスラッグを取られていたら slug_taken を返す */
  saveCoachProfile: (userId: string, profile: CoachProfile) => Promise<'saved' | 'slug_taken'>
  /** ランダムなスラッグ（generateCoachSlug に乱数を渡したもの） */
  generateSlug: () => CoachSlug
}>

export type UpdateCoachProfile = (
  params: UpdateCoachProfileParams,
  dependencies: Dependencies
) => Promise<Result<{ slug: CoachSlug }, 'not_found' | 'slug_taken' | 'slug_unavailable'>>

/** コーチが自分のプロフィールを変える */
export const updateCoachProfile: UpdateCoachProfile = async ({ actor, profile }, deps) => {
  const currentSlug = await deps.findCoachSlug(actor.userId)
  if (currentSlug === null) {
    return err('not_found')
  }
  if (
    profile.slug !== null &&
    profile.slug !== currentSlug &&
    (await deps.isSlugTaken(profile.slug))
  ) {
    return err('slug_taken')
  }
  const slug = profile.slug ?? (await allocateRandomSlug(deps))
  if (slug === null) {
    return err('slug_unavailable')
  }
  const saved = await deps.saveCoachProfile(actor.userId, { ...profile, slug })
  if (saved === 'slug_taken') {
    return err('slug_taken')
  }
  return ok({ slug })
}
