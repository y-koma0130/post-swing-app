import { err, ok, type Result } from '@/server/utils/result'
import { COACH_RULES, DEFAULT_PLANS } from '../../domain/rules'
import type { Coach } from '../../domain/values/Coach'
import type { CoachSlug } from '../../domain/values/CoachSlug'
import { allocateRandomSlug } from '../allocateRandomSlug'

export type InviteCoachParams = Readonly<{
  email: string
  name: string
  /** null なら、ランダムな文字列にする（コーチがあとで設定画面で変えられる） */
  slug: CoachSlug | null
}>

type Dependencies = Readonly<{
  findUserByEmail: (email: string) => Promise<{ id: string; isCoach: boolean } | null>
  isSlugTaken: (slug: CoachSlug) => Promise<boolean>
  /** userId が既存なら user は作らず、コーチのプロフィールだけ足す */
  saveInvitedCoach: (coach: Coach, user: { email: string; isNew: boolean }) => Promise<void>
  generateId: () => string
  generateSlug: () => CoachSlug
  /** 招待したコーチに、ログインの案内を送る */
  notifyCoachInvited: (input: { coachUserId: string }) => Promise<void>
}>

export type InviteCoach = (
  params: InviteCoachParams,
  dependencies: Dependencies
) => Promise<Result<{ userId: string }, 'already_coach' | 'slug_taken' | 'slug_unavailable'>>

/**
 * コーチを招待する（管理者だけが使う）
 *
 * 招待されたメールアドレスだけが、メールのコードでログインできる。
 * すでに生徒として登録されている人は、その user にコーチのプロフィールを足す。
 * 招待したら、ログインの案内をメールで送る
 */
export const inviteCoach: InviteCoach = async (params, deps) => {
  const existing = await deps.findUserByEmail(params.email)
  if (existing?.isCoach) {
    return err('already_coach')
  }
  if (params.slug !== null && (await deps.isSlugTaken(params.slug))) {
    return err('slug_taken')
  }
  const slug = params.slug ?? (await allocateRandomSlug(deps))
  if (slug === null) {
    return err('slug_unavailable')
  }

  const userId = existing?.id ?? deps.generateId()
  await deps.saveInvitedCoach(
    {
      userId,
      slug,
      name: params.name,
      title: '',
      bio: '',
      instagram: '',
      monthlyCapacity: COACH_RULES.defaultMonthlyCapacity,
      stripeAccountId: null,
      chargesEnabled: false,
      suspended: false,
      plans: [...DEFAULT_PLANS],
    },
    { email: params.email, isNew: existing === null }
  )
  await deps.notifyCoachInvited({ coachUserId: userId })
  return ok({ userId })
}
