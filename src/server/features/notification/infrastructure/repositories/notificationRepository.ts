import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { account, coachProfile, lineFriend, thread, user } from '@/server/db/schema'
import type { NotificationContext } from '../../domain/services/composeNotification.service'
import type { NotificationMessage } from '../../domain/values/NotificationMessage'

type Context = Omit<NotificationContext, 'appUrl'>

const findThreadContext = async (threadId: string): Promise<Context | null> => {
  const row = await getDb()
    .select({
      coachName: coachProfile.displayName,
      coachSlug: coachProfile.slug,
      coachUserId: thread.coachUserId,
      studentName: user.name,
      studentUserId: thread.studentUserId,
      expiresAt: thread.expiresAt,
    })
    .from(thread)
    .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
    .innerJoin(user, eq(user.id, thread.studentUserId))
    .where(eq(thread.id, threadId))
    .get()
  return row ?? null
}

/** 生徒がいない通知（コーチの招待）。生徒の欄は空にする */
const findCoachOnlyContext = async (coachUserId: string): Promise<Context | null> => {
  const coach = await getDb()
    .select({ name: coachProfile.displayName, slug: coachProfile.slug })
    .from(coachProfile)
    .where(eq(coachProfile.userId, coachUserId))
    .get()
  if (!coach) return null
  return {
    coachName: coach.name,
    coachSlug: coach.slug,
    coachUserId,
    studentName: '',
    studentUserId: '',
    expiresAt: null,
  }
}

export type FindNotificationContext = (message: NotificationMessage) => Promise<Context | null>
export const findNotificationContext: FindNotificationContext = async (message) => {
  if (message.kind === 'coach_invited' || message.kind === 'absence_ended') {
    return findCoachOnlyContext(message.coachUserId)
  }
  if (message.kind !== 'waitlist_opened') {
    return findThreadContext(message.threadId)
  }
  const db = getDb()
  const [coach, student] = await Promise.all([
    db
      .select({ name: coachProfile.displayName, slug: coachProfile.slug })
      .from(coachProfile)
      .where(eq(coachProfile.userId, message.coachUserId))
      .get(),
    db.select({ name: user.name }).from(user).where(eq(user.id, message.studentUserId)).get(),
  ])
  if (!coach || !student) return null
  return {
    coachName: coach.name,
    coachSlug: coach.slug,
    coachUserId: message.coachUserId,
    studentName: student.name,
    studentUserId: message.studentUserId,
    expiresAt: null,
  }
}

export type FindLineRecipient = (
  userId: string
) => Promise<{ lineUserId: string; isFriend: boolean | null } | null>
/**
 * LINE でログインした人の LINE ユーザーIDと、公式アカウントの友だちかどうか。
 * Webhook で友だち追加・ブロックを受けていなければ isFriend は null（記録がない）
 */
export const findLineRecipient: FindLineRecipient = async (userId) => {
  const row = await getDb()
    .select({ lineUserId: account.accountId, isFriend: lineFriend.isFriend })
    .from(account)
    .leftJoin(lineFriend, eq(lineFriend.lineUserId, account.accountId))
    .where(and(eq(account.userId, userId), eq(account.providerId, 'line')))
    .get()
  return row ? { lineUserId: row.lineUserId, isFriend: row.isFriend } : null
}

export type FindDeliverableEmail = (userId: string) => Promise<string | null>
/** 送れるメールアドレス。LINE の人に入れた仮のアドレス（.invalid）は除く */
export const findDeliverableEmail: FindDeliverableEmail = async (userId) => {
  const row = await getDb()
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .get()
  return row && !row.email.endsWith('.invalid') ? row.email : null
}

export type SaveLineFriend = (lineUserId: string, isFriend: boolean) => Promise<void>
export const saveLineFriend: SaveLineFriend = async (lineUserId, isFriend) => {
  const now = new Date()
  await getDb()
    .insert(lineFriend)
    .values({ lineUserId, isFriend, updatedAt: now })
    .onConflictDoUpdate({ target: lineFriend.lineUserId, set: { isFriend, updatedAt: now } })
}
