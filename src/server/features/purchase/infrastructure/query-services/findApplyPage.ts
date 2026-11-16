import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { waitlistEntry } from '@/server/db/schema'
import { findCoachProfileBySlug } from '@/server/features/coach/public'
import type { ApplyPageDto } from '../../application/dto/ApplyPage.dto'
import {
  findCoachUserIdBySlug,
  hasActiveSubscription,
  hasPaidTrial,
} from '../repositories/purchaseRepository'

export type FindApplyPage = (
  slug: string,
  studentUserId: string | null
) => Promise<ApplyPageDto | null>

export const findApplyPage: FindApplyPage = async (slug, studentUserId) => {
  const [coach, coachUserId] = await Promise.all([
    findCoachProfileBySlug(slug),
    findCoachUserIdBySlug(slug),
  ])
  if (!coach || coachUserId === null) {
    return null
  }
  if (studentUserId === null) {
    return { coach, isFull: coach.remainingCapacity === 0, student: null }
  }
  const [trialUsed, subscribed, waitlist] = await Promise.all([
    hasPaidTrial(studentUserId, coachUserId),
    hasActiveSubscription(studentUserId, coachUserId),
    getDb()
      .select({ id: waitlistEntry.id })
      .from(waitlistEntry)
      .where(
        and(
          eq(waitlistEntry.coachUserId, coachUserId),
          eq(waitlistEntry.studentUserId, studentUserId)
        )
      )
      .get(),
  ])
  return {
    coach,
    isFull: coach.remainingCapacity === 0,
    student: { trialUsed, subscribed, onWaitlist: waitlist !== undefined },
  }
}
