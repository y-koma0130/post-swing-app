import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, coachReview } from '@/server/db/schema'
import type { CoachReviewSummaryDto } from '../../application/dto/CoachReviewSummary.dto'

const RECENT_LIMIT = 5

export const findCoachReviewSummary = async (coachSlug: string): Promise<CoachReviewSummaryDto> => {
  const rows = await getDb()
    .select({
      id: coachReview.id,
      rating: coachReview.rating,
      comment: coachReview.comment,
      coachReply: coachReview.coachReply,
      createdAt: coachReview.createdAt,
    })
    .from(coachReview)
    .innerJoin(coachProfile, eq(coachProfile.userId, coachReview.coachUserId))
    .where(eq(coachProfile.slug, coachSlug))
    .orderBy(desc(coachReview.createdAt))
    .all()
  const total = rows.reduce((sum, r) => sum + r.rating, 0)
  return {
    count: rows.length,
    average: rows.length === 0 ? null : Math.round((total / rows.length) * 10) / 10,
    recent: rows.slice(0, RECENT_LIMIT),
  }
}
