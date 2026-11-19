import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { isUniqueViolation } from '@/server/db/isUniqueViolation'
import { coachProfile, plan, user } from '@/server/db/schema'
import { type Coach, type CoachProfile, coachSchema } from '../../domain/values/Coach'
import { knownLicenses } from '../../domain/values/CoachLicense'
import { type CoachSlug, coachSlugSchema } from '../../domain/values/CoachSlug'
import type { Plan } from '../../domain/values/Plan'

export type FindUserByEmail = (email: string) => Promise<{ id: string; isCoach: boolean } | null>
export const findUserByEmail: FindUserByEmail = async (email) => {
  const row = await getDb()
    .select({ id: user.id, coachUserId: coachProfile.userId })
    .from(user)
    .leftJoin(coachProfile, eq(coachProfile.userId, user.id))
    .where(eq(user.email, email.toLowerCase()))
    .get()
  return row ? { id: row.id, isCoach: row.coachUserId !== null } : null
}

export type IsSlugTaken = (slug: CoachSlug) => Promise<boolean>
export const isSlugTaken: IsSlugTaken = async (slug) => {
  const row = await getDb()
    .select({ userId: coachProfile.userId })
    .from(coachProfile)
    .where(eq(coachProfile.slug, slug))
    .get()
  return row !== undefined
}

export type FindCoachSlug = (userId: string) => Promise<CoachSlug | null>
export const findCoachSlug: FindCoachSlug = async (userId) => {
  const row = await getDb()
    .select({ slug: coachProfile.slug })
    .from(coachProfile)
    .where(eq(coachProfile.userId, userId))
    .get()
  return row ? coachSlugSchema.parse(row.slug) : null
}

export type IsCoach = (userId: string) => Promise<boolean>
export const isCoach: IsCoach = async (userId) => (await findCoachSlug(userId)) !== null

export type FindCoachByUserId = (userId: string) => Promise<Coach | null>
export const findCoachByUserId: FindCoachByUserId = async (userId) => {
  const db = getDb()
  const profile = await db.select().from(coachProfile).where(eq(coachProfile.userId, userId)).get()
  if (!profile) {
    return null
  }
  const plans = await db.select().from(plan).where(eq(plan.coachUserId, userId)).all()
  return coachSchema.parse({
    userId: profile.userId,
    slug: profile.slug,
    name: profile.displayName,
    title: profile.title,
    bio: profile.bio,
    instagram: profile.instagram,
    licenses: knownLicenses(profile.licenses),
    licenseOther: profile.licenseOther,
    monthlyCapacity: profile.monthlyCapacity,
    stripeAccountId: profile.stripeAccountId,
    chargesEnabled: profile.chargesEnabled,
    suspended: profile.suspendedAt !== null,
    plans: plans.map((p) => ({
      kind: p.kind,
      name: p.name,
      price: p.priceYen,
      description: p.description,
      active: p.active,
    })),
  })
}

const planRows = (userId: string, plans: readonly Plan[], now: Date) =>
  plans.map((p) => ({
    id: crypto.randomUUID(),
    coachUserId: userId,
    kind: p.kind,
    name: p.name,
    priceYen: p.price,
    description: p.description,
    active: p.active,
    createdAt: now,
    updatedAt: now,
  }))

/** 保存の結果。確かめてから保存するまでに同じスラッグを取られたら slug_taken */
export type SaveSlugResult = 'saved' | 'slug_taken'

const SLUG_COLUMN = 'coach_profile.slug'

/** 書き込みを試し、スラッグの一意制約で止められたら slug_taken にする（ほかのエラーはそのまま投げる） */
const withSlugGuard = async (write: () => Promise<unknown>): Promise<SaveSlugResult> => {
  try {
    await write()
    return 'saved'
  } catch (error) {
    if (isUniqueViolation(error, SLUG_COLUMN)) return 'slug_taken'
    throw error
  }
}

export type SaveInvitedCoach = (
  coach: Coach,
  invitedUser: { email: string; isNew: boolean }
) => Promise<SaveSlugResult>
export const saveInvitedCoach: SaveInvitedCoach = async (coach, invitedUser) => {
  const db = getDb()
  const now = new Date()
  const profileInsert = db.insert(coachProfile).values({
    userId: coach.userId,
    slug: coach.slug,
    displayName: coach.name,
    title: coach.title,
    bio: coach.bio,
    instagram: coach.instagram,
    licenses: [...coach.licenses],
    licenseOther: coach.licenseOther,
    monthlyCapacity: coach.monthlyCapacity,
    stripeAccountId: coach.stripeAccountId,
    chargesEnabled: coach.chargesEnabled,
    createdAt: now,
    updatedAt: now,
  })
  const plansInsert = db.insert(plan).values(planRows(coach.userId, coach.plans, now))

  // user・プロフィール・プランをまとめて書く（途中で失敗して半端なコーチが残らないように）
  return withSlugGuard(() =>
    invitedUser.isNew
      ? db.batch([
          db.insert(user).values({
            id: coach.userId,
            name: coach.name,
            email: invitedUser.email.toLowerCase(),
            emailVerified: false,
            createdAt: now,
            updatedAt: now,
          }),
          profileInsert,
          plansInsert,
        ])
      : db.batch([profileInsert, plansInsert])
  )
}

export type SaveCoachProfile = (userId: string, profile: CoachProfile) => Promise<SaveSlugResult>
export const saveCoachProfile: SaveCoachProfile = async (userId, profile) =>
  withSlugGuard(() =>
    getDb()
      .update(coachProfile)
      .set({
        slug: profile.slug,
        displayName: profile.name,
        title: profile.title,
        bio: profile.bio,
        instagram: profile.instagram,
        licenses: [...profile.licenses],
        licenseOther: profile.licenseOther,
        monthlyCapacity: profile.monthlyCapacity,
        updatedAt: new Date(),
      })
      .where(eq(coachProfile.userId, userId))
  )

export type SavePlans = (userId: string, plans: readonly Plan[]) => Promise<void>
export const savePlans: SavePlans = async (userId, plans) => {
  const db = getDb()
  const now = new Date()
  const [first, ...rest] = plans.map((p) =>
    db
      .update(plan)
      .set({
        name: p.name,
        priceYen: p.price,
        description: p.description,
        active: p.active,
        updatedAt: now,
      })
      .where(and(eq(plan.coachUserId, userId), eq(plan.kind, p.kind)))
  )
  if (!first) return
  await db.batch([first, ...rest])
}

export type FindPayoutAccount = (userId: string) => Promise<{
  stripeAccountId: string | null
  email: string
  slug: string
  displayName: string
} | null>
export const findPayoutAccount: FindPayoutAccount = async (userId) => {
  const row = await getDb()
    .select({
      stripeAccountId: coachProfile.stripeAccountId,
      email: user.email,
      slug: coachProfile.slug,
      displayName: coachProfile.displayName,
    })
    .from(coachProfile)
    .innerJoin(user, eq(user.id, coachProfile.userId))
    .where(eq(coachProfile.userId, userId))
    .get()
  return row ?? null
}

export type FindStripeAccountId = (userId: string) => Promise<string | null>
export const findStripeAccountId: FindStripeAccountId = async (userId) =>
  (await findPayoutAccount(userId))?.stripeAccountId ?? null

export type SaveStripeAccountId = (userId: string, stripeAccountId: string) => Promise<void>
export const saveStripeAccountId: SaveStripeAccountId = async (userId, stripeAccountId) => {
  await getDb()
    .update(coachProfile)
    .set({ stripeAccountId, updatedAt: new Date() })
    .where(eq(coachProfile.userId, userId))
}

export type SaveChargesEnabled = (stripeAccountId: string, chargesEnabled: boolean) => Promise<void>
export const saveChargesEnabled: SaveChargesEnabled = async (stripeAccountId, chargesEnabled) => {
  await getDb()
    .update(coachProfile)
    .set({ chargesEnabled, updatedAt: new Date() })
    .where(eq(coachProfile.stripeAccountId, stripeAccountId))
}

export type SaveCoachSuspended = (userId: string, suspendedAt: Date | null) => Promise<void>
/** 受付を止める（日時）・再開する（null） */
export const saveCoachSuspended: SaveCoachSuspended = async (userId, suspendedAt) => {
  await getDb()
    .update(coachProfile)
    .set({ suspendedAt, updatedAt: new Date() })
    .where(eq(coachProfile.userId, userId))
}

export type FindAvatarKey = (coachUserId: string) => Promise<string | null>
export const findAvatarKey: FindAvatarKey = async (coachUserId) => {
  const row = await getDb()
    .select({ key: coachProfile.avatarR2Key })
    .from(coachProfile)
    .where(eq(coachProfile.userId, coachUserId))
    .get()
  return row?.key ?? null
}

export type FindAvatarKeyBySlug = (slug: string) => Promise<string | null>
export const findAvatarKeyBySlug: FindAvatarKeyBySlug = async (slug) => {
  const row = await getDb()
    .select({ key: coachProfile.avatarR2Key })
    .from(coachProfile)
    .where(eq(coachProfile.slug, slug))
    .get()
  return row?.key ?? null
}

export type SaveAvatarKey = (coachUserId: string, r2Key: string | null) => Promise<void>
export const saveAvatarKey: SaveAvatarKey = async (coachUserId, r2Key) => {
  await getDb()
    .update(coachProfile)
    .set({ avatarR2Key: r2Key, updatedAt: new Date() })
    .where(eq(coachProfile.userId, coachUserId))
}
