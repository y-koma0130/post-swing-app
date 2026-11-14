import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { CoachProfile } from '../../domain/values/Coach'
import type { CoachSlug } from '../../domain/values/CoachSlug'

export type UpdateCoachProfileParams = Readonly<{
  actor: Actor
  profile: CoachProfile
}>

type Dependencies = Readonly<{
  findCoachSlug: (userId: string) => Promise<CoachSlug | null>
  isSlugTaken: (slug: CoachSlug) => Promise<boolean>
  saveCoachProfile: (userId: string, profile: CoachProfile) => Promise<void>
}>

export type UpdateCoachProfile = (
  params: UpdateCoachProfileParams,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | 'slug_taken'>>

/** コーチが自分のプロフィールを変える */
export const updateCoachProfile: UpdateCoachProfile = async ({ actor, profile }, deps) => {
  const currentSlug = await deps.findCoachSlug(actor.userId)
  if (currentSlug === null) {
    return err('not_found')
  }
  if (profile.slug !== currentSlug && (await deps.isSlugTaken(profile.slug))) {
    return err('slug_taken')
  }
  await deps.saveCoachProfile(actor.userId, profile)
  return ok(undefined)
}
