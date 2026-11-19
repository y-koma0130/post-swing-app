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
  /** 売上の受け取り口座（Stripe）。まだ作っていなければ null */
  findStripeAccountId: (userId: string) => Promise<string | null>
  /** 口座のビジネスの情報（Webサイト＝受付ページ・屋号＝活動名）を合わせる。失敗しても投げない */
  syncConnectProfile: (input: {
    stripeAccountId: string
    slug: CoachSlug
    displayName: string
  }) => Promise<void>
}>

export type UpdateCoachProfile = (
  params: UpdateCoachProfileParams,
  dependencies: Dependencies
) => Promise<Result<{ slug: CoachSlug }, 'not_found' | 'slug_taken' | 'slug_unavailable'>>

/**
 * コーチが自分のプロフィールを変える
 *
 * 売上の受け取り口座があれば、Stripe に登録した受付ページの URL と活動名も合わせる
 * （スラッグを変えると古い URL が 404 になるため）
 */
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
  const stripeAccountId = await deps.findStripeAccountId(actor.userId)
  if (stripeAccountId !== null) {
    await deps.syncConnectProfile({ stripeAccountId, slug, displayName: profile.name })
  }
  return ok({ slug })
}
