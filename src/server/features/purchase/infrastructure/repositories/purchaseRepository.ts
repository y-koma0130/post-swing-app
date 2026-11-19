import 'server-only'
import { and, asc, count, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, plan, purchase, thread, waitlistEntry } from '@/server/db/schema'
import { MONITOR_COUNTED_PURCHASE_STATUSES } from '@/server/features/monitor/domain/rules'
import { CAPACITY_COUNTED_STATUSES } from '@/server/features/thread/domain/rules'
import type { ActiveSubscription } from '../../application/usecases/lowerMonthlyPrices.usecase'
import type { CheckoutCoach } from '../../application/usecases/startApplication.usecase'
import { type Purchase, purchaseSchema } from '../../domain/values/Purchase'

export type FindCoachForCheckout = (slug: string) => Promise<CheckoutCoach | null>
export const findCoachForCheckout: FindCoachForCheckout = async (slug) => {
  const db = getDb()
  const coach = await db.select().from(coachProfile).where(eq(coachProfile.slug, slug)).get()
  if (!coach) {
    return null
  }
  const plans = await db.select().from(plan).where(eq(plan.coachUserId, coach.userId)).all()
  return {
    userId: coach.userId,
    name: coach.displayName,
    stripeAccountId: coach.stripeAccountId,
    chargesEnabled: coach.chargesEnabled,
    suspended: coach.suspendedAt !== null,
    monthlyCapacity: coach.monthlyCapacity,
    plans: plans.map((p) => ({
      kind: p.kind,
      name: p.name,
      priceYen: p.priceYen,
      active: p.active,
    })),
  }
}

export type FindCoachForCheckoutByUserId = (
  coachUserId: string
) => Promise<(CheckoutCoach & { slug: string }) | null>
export const findCoachForCheckoutByUserId: FindCoachForCheckoutByUserId = async (coachUserId) => {
  const row = await getDb()
    .select({ slug: coachProfile.slug })
    .from(coachProfile)
    .where(eq(coachProfile.userId, coachUserId))
    .get()
  if (!row) return null
  const coach = await findCoachForCheckout(row.slug)
  return coach ? { ...coach, slug: row.slug } : null
}

export type FindCoachUserIdBySlug = (slug: string) => Promise<string | null>
export const findCoachUserIdBySlug: FindCoachUserIdBySlug = async (slug) => {
  const row = await getDb()
    .select({ userId: coachProfile.userId })
    .from(coachProfile)
    .where(eq(coachProfile.slug, slug))
    .get()
  return row?.userId ?? null
}

/** 進行中（終了していない）スレッドの数。受付枠と比べる */
export type CountActiveThreads = (coachUserId: string) => Promise<number>
export const countActiveThreads: CountActiveThreads = async (coachUserId) => {
  const row = await getDb()
    .select({ n: count() })
    .from(thread)
    .where(
      and(
        eq(thread.coachUserId, coachUserId),
        inArray(thread.status, [...CAPACITY_COUNTED_STATUSES])
      )
    )
    .get()
  return row?.n ?? 0
}

const hasPaidPurchase = async (
  studentUserId: string,
  coachUserId: string,
  planKind: Purchase['planKind'],
  statuses: Array<Purchase['status']>
): Promise<boolean> => {
  const row = await getDb()
    .select({ id: purchase.id })
    .from(purchase)
    .where(
      and(
        eq(purchase.studentUserId, studentUserId),
        eq(purchase.coachUserId, coachUserId),
        eq(purchase.planKind, planKind),
        inArray(purchase.status, statuses)
      )
    )
    .get()
  return row !== undefined
}

/** お試しを使ったか。承認待ち（仮押さえ）も使った扱い。断られたら使っていない扱いに戻る */
export type HasPaidTrial = (studentUserId: string, coachUserId: string) => Promise<boolean>
export const hasPaidTrial: HasPaidTrial = (studentUserId, coachUserId) =>
  hasPaidPurchase(studentUserId, coachUserId, 'trial', ['authorized', 'paid'])

/** 支払い済みで解約されていない月額 */
export type HasActiveSubscription = (studentUserId: string, coachUserId: string) => Promise<boolean>
export const hasActiveSubscription: HasActiveSubscription = (studentUserId, coachUserId) =>
  hasPaidPurchase(studentUserId, coachUserId, 'monthly', ['paid'])

export type SavePendingPurchase = (
  p: Purchase,
  monitorLimit: Readonly<{ codeId: string; maxUses: number }> | null
) => Promise<boolean>
/**
 * 申し込み途中の申し込みを作る。モニターなら、そのコードの申し込みが先着の人数に満たないときだけ作る
 * （同時に申し込まれても超えないよう、数える条件を INSERT の中に入れた1つの文にする。D1 は書き込みを1つずつ処理する）
 */
export const savePendingPurchase: SavePendingPurchase = async (p, monitorLimit) => {
  const now = Date.now()
  const counted = sql.join(
    MONITOR_COUNTED_PURCHASE_STATUSES.map((status) => sql`${status}`),
    sql`, `
  )
  const result = await getDb().run(sql`
    INSERT INTO purchase
      (id, student_user_id, coach_user_id, plan_kind, price_yen, system_fee_yen, status,
       monitor_code_id, created_at, updated_at)
    SELECT ${p.id}, ${p.studentUserId}, ${p.coachUserId}, ${p.planKind}, ${p.priceYen},
      ${p.systemFeeYen}, ${p.status}, ${p.monitorCodeId}, ${now}, ${now}
    WHERE ${
      monitorLimit === null
        ? sql`1`
        : sql`(SELECT count(*) FROM purchase u
      WHERE u.monitor_code_id = ${monitorLimit.codeId} AND u.status IN (${counted}))
      < ${monitorLimit.maxUses}`
    }
  `)
  return result.meta.changes > 0
}

export type AttachCheckoutSession = (purchaseId: string, sessionId: string) => Promise<void>
export const attachCheckoutSession: AttachCheckoutSession = async (purchaseId, sessionId) => {
  await getDb()
    .update(purchase)
    .set({ stripeCheckoutSessionId: sessionId, updatedAt: new Date() })
    .where(eq(purchase.id, purchaseId))
}

export type FindPurchase = (purchaseId: string) => Promise<Purchase | null>
export const findPurchase: FindPurchase = async (purchaseId) => {
  const row = await getDb().select().from(purchase).where(eq(purchase.id, purchaseId)).get()
  return row ? purchaseSchema.parse(row) : null
}

export type FindPurchaseForRefund = (
  purchaseId: string
) => Promise<(Purchase & { stripeCheckoutSessionId: string | null }) | null>
/** 返金のための申し込み（Checkout の ID も一緒に） */
export const findPurchaseForRefund: FindPurchaseForRefund = async (purchaseId) => {
  const row = await getDb().select().from(purchase).where(eq(purchase.id, purchaseId)).get()
  return row
    ? { ...purchaseSchema.parse(row), stripeCheckoutSessionId: row.stripeCheckoutSessionId }
    : null
}

export type MarkPurchasePaid = (
  purchaseId: string,
  payment: { stripeCustomerId: string | null; stripeSubscriptionId: string | null }
) => Promise<void>
export const markPurchasePaid: MarkPurchasePaid = async (purchaseId, payment) => {
  await getDb()
    .update(purchase)
    .set({ status: 'paid', ...payment, updatedAt: new Date() })
    .where(eq(purchase.id, purchaseId))
}

export type MarkPurchaseAuthorized = (
  purchaseId: string,
  payment: { stripePaymentIntentId: string | null; stripeCustomerId: string | null }
) => Promise<void>
/** カードを仮押さえした（支払い画面に進んだままのときだけ）。開発用の申し込みでは Stripe の ID がない */
export const markPurchaseAuthorized: MarkPurchaseAuthorized = async (purchaseId, payment) => {
  await getDb()
    .update(purchase)
    .set({ status: 'authorized', ...payment, updatedAt: new Date() })
    .where(and(eq(purchase.id, purchaseId), eq(purchase.status, 'pending')))
}

export type MarkPurchaseCaptured = (
  purchaseId: string,
  payment: { stripeSubscriptionId: string | null }
) => Promise<void>
/** 仮押さえした支払いを確定した（月額なら、始めたサブスクリプションも） */
export const markPurchaseCaptured: MarkPurchaseCaptured = async (purchaseId, payment) => {
  await getDb()
    .update(purchase)
    .set({ status: 'paid', ...payment, updatedAt: new Date() })
    .where(and(eq(purchase.id, purchaseId), eq(purchase.status, 'authorized')))
}

export type MarkPurchaseVoided = (purchaseId: string) => Promise<void>
/** 仮押さえを外した（請求していない） */
export const markPurchaseVoided: MarkPurchaseVoided = async (purchaseId) => {
  await getDb()
    .update(purchase)
    .set({ status: 'voided', updatedAt: new Date() })
    .where(and(eq(purchase.id, purchaseId), inArray(purchase.status, ['pending', 'authorized'])))
}

export type MarkSubscriptionCanceled = (stripeSubscriptionId: string) => Promise<void>
export const markSubscriptionCanceled: MarkSubscriptionCanceled = async (stripeSubscriptionId) => {
  await getDb()
    .update(purchase)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(eq(purchase.stripeSubscriptionId, stripeSubscriptionId))
}

export type SaveWaitlistEntry = (coachUserId: string, studentUserId: string) => Promise<void>
export const saveWaitlistEntry: SaveWaitlistEntry = async (coachUserId, studentUserId) => {
  await getDb()
    .insert(waitlistEntry)
    .values({ id: crypto.randomUUID(), coachUserId, studentUserId, createdAt: new Date() })
    .onConflictDoNothing()
}

export type FindPortalCustomer = (
  purchaseId: string,
  studentUserId: string
) => Promise<string | null>
/** 本人の月額の申し込みの Stripe の顧客ID（他人の申し込みなら null） */
export const findPortalCustomer: FindPortalCustomer = async (purchaseId, studentUserId) => {
  const row = await getDb()
    .select({ customerId: purchase.stripeCustomerId })
    .from(purchase)
    .where(and(eq(purchase.id, purchaseId), eq(purchase.studentUserId, studentUserId)))
    .get()
  return row?.customerId ?? null
}

export type FindCoachesWithWaitlist = () => Promise<
  Array<{ coachUserId: string; monthlyCapacity: number; activeThreadCount: number }>
>
/** まだ知らせていないキャンセル待ちがいるコーチと、受付枠・受付中のスレッドの数 */
export const findCoachesWithWaitlist: FindCoachesWithWaitlist = async () => {
  const db = getDb()
  const coaches = await db
    .selectDistinct({
      coachUserId: waitlistEntry.coachUserId,
      capacity: coachProfile.monthlyCapacity,
    })
    .from(waitlistEntry)
    .innerJoin(coachProfile, eq(coachProfile.userId, waitlistEntry.coachUserId))
    .where(isNull(waitlistEntry.notifiedAt))
    .all()
  return Promise.all(
    coaches.map(async (c) => ({
      coachUserId: c.coachUserId,
      monthlyCapacity: c.capacity,
      activeThreadCount: await countActiveThreads(c.coachUserId),
    }))
  )
}

export type FindWaitingStudents = (coachUserId: string, limit: number) => Promise<string[]>
export const findWaitingStudents: FindWaitingStudents = async (coachUserId, limit) => {
  const rows = await getDb()
    .select({ studentUserId: waitlistEntry.studentUserId })
    .from(waitlistEntry)
    .where(and(eq(waitlistEntry.coachUserId, coachUserId), isNull(waitlistEntry.notifiedAt)))
    .orderBy(asc(waitlistEntry.createdAt))
    .limit(limit)
    .all()
  return rows.map((r) => r.studentUserId)
}

export type MarkWaitlistNotified = (
  coachUserId: string,
  studentUserIds: string[],
  at: Date
) => Promise<void>
export const markWaitlistNotified: MarkWaitlistNotified = async (
  coachUserId,
  studentUserIds,
  at
) => {
  await getDb()
    .update(waitlistEntry)
    .set({ notifiedAt: at })
    .where(
      and(
        eq(waitlistEntry.coachUserId, coachUserId),
        inArray(waitlistEntry.studentUserId, studentUserIds)
      )
    )
}

export type FindActiveSubscriptions = (coachUserId: string) => Promise<ActiveSubscription[]>
/** このコーチの、続いている月額（支払い済みで解約されていないもの） */
export const findActiveSubscriptions: FindActiveSubscriptions = async (coachUserId) => {
  const rows = await getDb()
    .select({
      purchaseId: purchase.id,
      subscriptionId: purchase.stripeSubscriptionId,
      priceYen: purchase.priceYen,
      systemFeeYen: purchase.systemFeeYen,
    })
    .from(purchase)
    .where(
      and(
        eq(purchase.coachUserId, coachUserId),
        eq(purchase.planKind, 'monthly'),
        eq(purchase.status, 'paid'),
        isNotNull(purchase.stripeSubscriptionId)
      )
    )
    .all()
  return rows.flatMap((r) => (r.subscriptionId ? [{ ...r, subscriptionId: r.subscriptionId }] : []))
}

export type SavePurchasePrice = (
  purchaseId: string,
  price: Readonly<{ priceYen: number; systemFeeYen: number }>
) => Promise<void>
/** 月額の値下げを反映した価格とシステム利用料（次の請求から） */
export const savePurchasePrice: SavePurchasePrice = async (
  purchaseId,
  { priceYen, systemFeeYen }
) => {
  await getDb()
    .update(purchase)
    .set({ priceYen, systemFeeYen, updatedAt: new Date() })
    .where(eq(purchase.id, purchaseId))
}
