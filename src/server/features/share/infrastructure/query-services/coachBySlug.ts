import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile } from '@/server/db/schema'

export type FindCoachUserIdBySlug = (slug: string) => Promise<string | null>
/** 受付ページの URL のコーチ（マイページで公開の許可を変えるとき） */
export const findCoachUserIdBySlug: FindCoachUserIdBySlug = async (slug) => {
  const row = await getDb()
    .select({ userId: coachProfile.userId })
    .from(coachProfile)
    .where(eq(coachProfile.slug, slug))
    .get()
  return row?.userId ?? null
}
