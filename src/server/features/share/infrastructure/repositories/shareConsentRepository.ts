import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { shareConsent, shareConsentLog } from '@/server/db/schema'
import type { ShareConsent } from '../../domain/values/ShareConsent'

export type SaveShareConsent = (consent: ShareConsent) => Promise<void>
/** 公開の許可を書き、同じ内容を履歴にも足す */
export const saveShareConsent: SaveShareConsent = async (consent) => {
  const db = getDb()
  const choices = {
    allowPublish: consent.allowPublish,
    showFace: consent.showFace,
    showAgeRange: consent.showAgeRange,
    showScore: consent.showScore,
    textVersion: consent.textVersion,
  }
  await db.batch([
    db
      .insert(shareConsent)
      .values({
        coachUserId: consent.coachUserId,
        studentUserId: consent.studentUserId,
        ...choices,
        updatedAt: consent.updatedAt,
      })
      .onConflictDoUpdate({
        target: [shareConsent.coachUserId, shareConsent.studentUserId],
        set: { ...choices, updatedAt: consent.updatedAt },
      }),
    db.insert(shareConsentLog).values({
      id: crypto.randomUUID(),
      coachUserId: consent.coachUserId,
      studentUserId: consent.studentUserId,
      ...choices,
      createdAt: consent.updatedAt,
    }),
  ])
}

export type FindShareConsent = (
  coachUserId: string,
  studentUserId: string
) => Promise<ShareConsent | null>
export const findShareConsent: FindShareConsent = async (coachUserId, studentUserId) => {
  const row = await getDb()
    .select()
    .from(shareConsent)
    .where(
      and(eq(shareConsent.coachUserId, coachUserId), eq(shareConsent.studentUserId, studentUserId))
    )
    .get()
  return row ?? null
}
